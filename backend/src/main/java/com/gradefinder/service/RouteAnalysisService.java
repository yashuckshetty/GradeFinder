package com.gradefinder.service;

import com.gradefinder.algorithm.*;
import com.gradefinder.config.AppConfig;
import com.gradefinder.dto.RouteAnalysisResponseDto;
import com.gradefinder.dto.RouteAnalysisResponseDto.*;
import com.gradefinder.model.*;
import com.gradefinder.parser.GpxParser;
import com.gradefinder.validation.GpxValidator;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.*;

/**
 * Orchestrates the full analysis pipeline:
 * validate → parse → preprocess → compute distances → run climb engine →
 * run recovery engine → classify zones → build response DTO → downsample render points.
 */
@Service
public class RouteAnalysisService {

    private final AppConfig config;
    private final GpxValidator validator;
    private final GpxParser parser;
    private final ElevationPreprocessor preprocessor;
    private final DistanceCalculator distCalc;
    private final ToleranceKadaneEngine kadane;
    private final SegmentClassifier classifier;

    // In-memory cache for simulation/comparison (keyed by routeId)
    private final Map<String, List<RoutePoint>> routeCache = new LinkedHashMap<>() {
        @Override
        protected boolean removeEldestEntry(Map.Entry<String, List<RoutePoint>> eldest) {
            return size() > 20; // Keep last 20 routes in memory
        }
    };

    public RouteAnalysisService(AppConfig config, GpxValidator validator) {
        this.config = config;
        this.validator = validator;
        this.parser = new GpxParser();
        this.preprocessor = new ElevationPreprocessor();
        this.distCalc = new DistanceCalculator();
        this.kadane = new ToleranceKadaneEngine();
        this.classifier = new SegmentClassifier();
    }

    /**
     * Analyze an uploaded GPX file.
     */
    public RouteAnalysisResponseDto analyzeFile(MultipartFile file,
                                                  Double descentToleranceOverride,
                                                  Double minGainOverride,
                                                  Double minGradeOverride) {
        validator.validateFile(file);

        try (InputStream is = file.getInputStream()) {
            GpxParser.ParseResult parseResult = parser.parse(is);
            List<RoutePoint> points = new ArrayList<>(parseResult.getPoints());
            List<String> warnings = new ArrayList<>(parseResult.getWarnings());

            // Post-parse validation
            warnings.addAll(validator.validatePoints(points));

            String routeId = UUID.randomUUID().toString();
            String routeName = parseResult.getRouteName() != null
                    ? parseResult.getRouteName()
                    : file.getOriginalFilename();

            return analyzePoints(points, routeId, routeName, warnings,
                    descentToleranceOverride, minGainOverride, minGradeOverride);

        } catch (IOException e) {
            throw new com.gradefinder.exception.InvalidGpxException("INVALID_GPX",
                    "Unable to read the uploaded file.");
        }
    }

    /**
     * Analyze a demo route by ID.
     */
    public RouteAnalysisResponseDto analyzeDemo(String demoId,
                                                  Double descentToleranceOverride,
                                                  Double minGainOverride,
                                                  Double minGradeOverride) {
        InputStream is = getClass().getResourceAsStream("/demo-routes/" + demoId + ".gpx");
        if (is == null) {
            throw new com.gradefinder.exception.InvalidGpxException("INVALID_GPX",
                    "Demo route not found: " + demoId);
        }

        GpxParser.ParseResult parseResult = parser.parse(is);
        List<RoutePoint> points = new ArrayList<>(parseResult.getPoints());
        List<String> warnings = new ArrayList<>(parseResult.getWarnings());

        return analyzePoints(points, demoId,
                parseResult.getRouteName() != null ? parseResult.getRouteName() : demoId,
                warnings, descentToleranceOverride, minGainOverride, minGradeOverride);
    }

    /**
     * Core analysis on a list of points. Used by both file upload and demo routes.
     */
    public RouteAnalysisResponseDto analyzePoints(List<RoutePoint> points,
                                                    String routeId, String routeName,
                                                    List<String> warnings,
                                                    Double descentToleranceOverride,
                                                    Double minGainOverride,
                                                    Double minGradeOverride) {
        // Resolve parameters (per-request override > config default)
        double descentTolerance = descentToleranceOverride != null
                ? clampParam(descentToleranceOverride, 0, 50) : config.getAnalysis().getDescentTolerance();
        double minGain = minGainOverride != null
                ? clampParam(minGainOverride, 0, 1000) : config.getAnalysis().getMinSignificantGain();
        double minGrade = minGradeOverride != null
                ? clampParam(minGradeOverride, 0, 100) : config.getAnalysis().getMinSignificantGrade();
        int smoothingWindow = config.getAnalysis().getSmoothingWindow();
        double minStepDist = config.getValidation().getMinStepDistance();
        double ascentTolerance = config.getAnalysis().getAscentTolerance();

        // Preprocess: interpolate, clamp, smooth
        warnings.addAll(preprocessor.preprocess(points, smoothingWindow,
                config.getValidation().getMinElevation(), config.getValidation().getMaxElevation()));

        // Compute cumulative distances
        double[] cumDist = distCalc.computeCumulativeDistances(points);

        // Run core algorithm: max climb
        ToleranceKadaneEngine.Result climbResult = kadane.findMaxClimb(
                points, cumDist, descentTolerance, minGain, minGrade, minStepDist);

        Integer climbStart = null;
        Integer climbEnd = null;
        if (climbResult.getBestSegment() != null) {
            climbStart = climbResult.getBestSegment().getStartIndex();
            climbEnd = climbResult.getBestSegment().getEndIndex();
        }

        // Run core algorithm: max recovery (loss), excluding max climb region to guarantee disjointness
        ToleranceKadaneEngine.Result recoveryResult = kadane.findMaxRecovery(
                points, cumDist, ascentTolerance, minGain, minGrade, minStepDist,
                climbStart, climbEnd);

        // Classify zones
        List<RouteZone> zones = classifier.classify(points, cumDist, minStepDist);

        // Compute summary stats
        double totalGain = 0, totalLoss = 0;
        double highest = Double.NEGATIVE_INFINITY, lowest = Double.POSITIVE_INFINITY;

        for (int i = 0; i < points.size(); i++) {
            double ele = points.get(i).getSmoothedElevation();
            if (ele > highest) highest = ele;
            if (ele < lowest) lowest = ele;
            if (i > 0) {
                double delta = ele - points.get(i - 1).getSmoothedElevation();
                if (delta > 0) totalGain += delta;
                else totalLoss += (-delta);
            }
        }

        double totalDist = cumDist[cumDist.length - 1];
        double avgGrade = totalDist > 0
                ? (totalGain / totalDist) * 100.0 : 0.0;

        // Cache for simulation
        routeCache.put(routeId, new ArrayList<>(points));

        // Build response DTO
        RouteAnalysisResponseDto response = new RouteAnalysisResponseDto();
        response.setRouteId(routeId);
        response.setRouteName(routeName);

        // Summary
        SummaryDto summary = new SummaryDto();
        summary.setDistanceKm(round2(totalDist / 1000.0));
        summary.setTotalGainM(round2(totalGain));
        summary.setTotalLossM(round2(totalLoss));
        summary.setHighestPointM(round2(highest));
        summary.setLowestPointM(round2(lowest));
        summary.setAvgGradePercent(round2(avgGrade));
        response.setSummary(summary);

        // Climb
        response.setHasSignificantClimb(climbResult.isSignificant());
        if (climbResult.getBestSegment() != null) {
            response.setMaxClimbSegment(toClimbSegmentDto(climbResult.getBestSegment()));
        }
        response.setAlternateMaxima(
                climbResult.getAlternateMaxima().stream()
                        .map(this::toClimbSegmentDto).toList());

        // Recovery
        response.setHasSignificantRecovery(recoveryResult.isSignificant());
        if (recoveryResult.getBestSegment() != null) {
            response.setMaxRecoverySegment(toRecoverySegmentDto(
                    recoveryResult.getBestSegment(), climbResult.getBestSegment()));
        }

        // Zones
        response.setZones(zones.stream().map(z -> {
            ZoneDto zd = new ZoneDto();
            zd.setStartIndex(z.getStartIndex());
            zd.setEndIndex(z.getEndIndex());
            zd.setType(z.getType().name());
            return zd;
        }).toList());

        // Render points (downsampled if needed)
        List<PointDto> renderPts = buildRenderPoints(points, cumDist,
                config.getAnalysis().getRenderPointThreshold(),
                climbResult.getBestSegment(), recoveryResult.getBestSegment());
        response.setRenderPoints(renderPts);

        // Warnings
        response.setWarnings(warnings);

        // Message for no-significant-climb edge case
        if (!climbResult.isSignificant()) {
            response.setMessage("No significant sustained climb was detected in this route. " +
                    "The route may be flat, entirely downhill, or have only very minor elevation changes.");
        }

        // Algorithm parameters — full transparency
        Map<String, Object> params = new LinkedHashMap<>();
        params.put("descentTolerance", descentTolerance);
        params.put("ascentTolerance", ascentTolerance);
        params.put("minSignificantGain", minGain);
        params.put("minSignificantGrade", minGrade);
        params.put("smoothingWindow", smoothingWindow);
        response.setAlgorithmParameters(params);

        return response;
    }

    /**
     * Get cached points for simulation/comparison.
     */
    public List<RoutePoint> getCachedPoints(String routeId) {
        return routeCache.get(routeId);
    }

    // --- Private helpers ---

    /**
     * Map a climb-detected ClimbSegment to a SegmentDto, setting totalAscentM.
     */
    private SegmentDto toClimbSegmentDto(ClimbSegment seg) {
        SegmentDto dto = toBaseSegmentDto(seg);
        dto.setTotalAscentM(seg.getTotalAscentM());
        return dto;
    }

    /**
     * Map a recovery-detected ClimbSegment to a SegmentDto, setting totalDescentM
     * and verifying disjointness against the max climb segment.
     */
    private SegmentDto toRecoverySegmentDto(ClimbSegment seg, ClimbSegment climb) {
        SegmentDto dto = toBaseSegmentDto(seg);
        dto.setTotalDescentM(seg.getTotalAscentM());
        if (climb != null) {
            boolean overlaps = !(seg.getEndIndex() <= climb.getStartIndex()
                    || seg.getStartIndex() >= climb.getEndIndex());
            dto.setOverlapsWithClimb(overlaps);
        } else {
            dto.setOverlapsWithClimb(false);
        }
        return dto;
    }

    private SegmentDto toBaseSegmentDto(ClimbSegment seg) {
        SegmentDto dto = new SegmentDto();
        dto.setStartIndex(seg.getStartIndex());
        dto.setEndIndex(seg.getEndIndex());
        dto.setStartDistanceKm(round2(seg.getStartDistance() / 1000.0));
        dto.setEndDistanceKm(round2(seg.getEndDistance() / 1000.0));
        dto.setGainM(seg.getGain());
        dto.setAvgGradePercent(seg.getAvgGrade());
        dto.setLengthKm(round2(seg.getLength() / 1000.0));
        return dto;
    }

    /**
     * Build the renderPoints array — uniform stride downsampling that always
     * preserves segment boundary points.
     * <p>
     * Design decision: analytical correctness never depends on this array.
     * It is computed independently from the full dataset solely for rendering.
     */
    private List<PointDto> buildRenderPoints(List<RoutePoint> points, double[] cumDist,
                                              int threshold,
                                              ClimbSegment climb, ClimbSegment recovery) {
        // Collect indices that must be preserved
        Set<Integer> preservedIndices = new TreeSet<>();
        preservedIndices.add(0);
        preservedIndices.add(points.size() - 1);
        if (climb != null) {
            preservedIndices.add(climb.getStartIndex());
            preservedIndices.add(climb.getEndIndex());
        }
        if (recovery != null) {
            preservedIndices.add(recovery.getStartIndex());
            preservedIndices.add(recovery.getEndIndex());
        }

        Set<Integer> selectedIndices = new TreeSet<>(preservedIndices);

        if (points.size() > threshold) {
            // Uniform stride sampling
            int stride = Math.max(1, points.size() / threshold);
            for (int i = 0; i < points.size(); i += stride) {
                selectedIndices.add(i);
            }
        } else {
            // All points
            for (int i = 0; i < points.size(); i++) {
                selectedIndices.add(i);
            }
        }

        List<PointDto> result = new ArrayList<>();
        for (int idx : selectedIndices) {
            RoutePoint p = points.get(idx);
            PointDto dto = new PointDto();
            dto.setIndex(idx);
            dto.setLat(p.getLat());
            dto.setLon(p.getLon());
            dto.setElevationM(round2(p.getEffectiveElevation()));
            dto.setSmoothedElevationM(round2(
                    p.getSmoothedElevation() != null ? p.getSmoothedElevation() : p.getEffectiveElevation()));
            dto.setDistanceKm(round2(cumDist[idx] / 1000.0));
            result.add(dto);
        }

        return result;
    }

    private double round2(double v) {
        return Math.round(v * 100.0) / 100.0;
    }

    private double clampParam(double value, double min, double max) {
        return Math.max(min, Math.min(max, value));
    }
}
