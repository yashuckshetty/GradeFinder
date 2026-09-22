package com.gradefinder.service;

import com.gradefinder.dto.RouteAnalysisResponseDto;
import com.gradefinder.dto.SimulationResponseDto;
import com.gradefinder.model.RoutePoint;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Splices out a contiguous sub-range of points and re-invokes the full
 * analysis pipeline from scratch on the spliced sequence.
 * <p>
 * <h3>Design decision: full recompute over incremental update</h3>
 * The tolerance-based reset logic in ToleranceKadaneEngine is stateful and
 * non-associative — a segment-tree-style incremental update would be materially
 * more complex for no real benefit. Realistic route sizes (hundreds to a few
 * thousand points) make a full O(n) recompute complete in single-digit
 * milliseconds. Choosing simplicity here is a deliberate architectural
 * decision, not a shortcut to hide.
 */
@Service
public class RouteSimulationService {

    private final RouteAnalysisService analysisService;

    public RouteSimulationService(RouteAnalysisService analysisService) {
        this.analysisService = analysisService;
    }

    public SimulationResponseDto simulate(String routeId, int excludeStart, int excludeEnd) {
        // Retrieve cached points
        List<RoutePoint> original = analysisService.getCachedPoints(routeId);
        if (original == null) {
            try {
                analysisService.getOrAnalyzeRoute(routeId);
                original = analysisService.getCachedPoints(routeId);
            } catch (Exception ignored) {
            }
        }
        if (original == null) {
            throw new IllegalArgumentException(
                    "Route not found in cache. Please re-analyze the route first.");
        }

        // Validate exclusion range
        if (excludeStart < 0 || excludeEnd >= original.size() || excludeStart > excludeEnd) {
            throw new IllegalArgumentException(
                    "Invalid exclusion range [" + excludeStart + ", " + excludeEnd + "]. " +
                    "Must be within [0, " + (original.size() - 1) + "].");
        }

        // "Before" — re-analyze original (or use cached result)
        RouteAnalysisResponseDto before = analysisService.analyzePoints(
                deepCopyPoints(original),
                routeId + "-before", "Original", new ArrayList<>(),
                null, null, null);

        // Splice out the excluded range: P[0..a-1] + P[b+1..n-1]
        List<RoutePoint> spliced = new ArrayList<>();
        for (int i = 0; i < excludeStart; i++) {
            spliced.add(copyPoint(original.get(i)));
        }

        // For internal splices, close the geographic gap so the bypassed segment's
        // distance is excluded from the new route's cumulative distance and 3D terrain
        double offsetLat = 0.0;
        double offsetLon = 0.0;

        if (excludeStart > 0 && excludeEnd < original.size() - 1) {
            RoutePoint pPrev = original.get(excludeStart - 1);
            RoutePoint pCutStart = original.get(excludeStart);
            RoutePoint pCutEndNext = original.get(excludeEnd + 1);

            double stepLat = pCutStart.getLat() - pPrev.getLat();
            double stepLon = pCutStart.getLon() - pPrev.getLon();

            if (stepLat == 0.0 && stepLon == 0.0) {
                RoutePoint pCutEnd = original.get(excludeEnd);
                stepLat = pCutEndNext.getLat() - pCutEnd.getLat();
                stepLon = pCutEndNext.getLon() - pCutEnd.getLon();
            }
            if (stepLat == 0.0 && stepLon == 0.0 && original.size() > 1) {
                stepLat = (original.get(original.size() - 1).getLat() - original.get(0).getLat()) / (original.size() - 1);
                stepLon = (original.get(original.size() - 1).getLon() - original.get(0).getLon()) / (original.size() - 1);
            }

            offsetLat = pCutEndNext.getLat() - (pPrev.getLat() + stepLat);
            offsetLon = pCutEndNext.getLon() - (pPrev.getLon() + stepLon);
        }

        for (int i = excludeEnd + 1; i < original.size(); i++) {
            RoutePoint p = original.get(i);
            RoutePoint copy = new RoutePoint(
                    p.getLat() - offsetLat,
                    p.getLon() - offsetLon,
                    p.getElevation(),
                    p.getTimestamp()
            );
            spliced.add(copy);
        }

        // Validate spliced result has enough points
        if (spliced.size() < 2) {
            throw new IllegalArgumentException(
                    "Excluding points [" + excludeStart + ", " + excludeEnd +
                    "] leaves fewer than 2 points. Cannot analyze.");
        }

        // "After" — analyze the spliced sequence from scratch
        RouteAnalysisResponseDto after = analysisService.analyzePoints(
                spliced,
                routeId + "-after", "After detour", new ArrayList<>(),
                null, null, null);

        // Compute deltas
        Map<String, Object> delta = new LinkedHashMap<>();
        delta.put("distanceChangeKm",
                round2(after.getSummary().getDistanceKm() - before.getSummary().getDistanceKm()));
        delta.put("totalGainChangeM",
                round2(after.getSummary().getTotalGainM() - before.getSummary().getTotalGainM()));
        delta.put("totalLossChangeM",
                round2(after.getSummary().getTotalLossM() - before.getSummary().getTotalLossM()));
        delta.put("climbStillSignificant", after.isHasSignificantClimb());
        if (before.getMaxClimbSegment() != null && after.getMaxClimbSegment() != null) {
            delta.put("climbGainChangeM",
                    round2(after.getMaxClimbSegment().getGainM() - before.getMaxClimbSegment().getGainM()));
        }

        SimulationResponseDto response = new SimulationResponseDto();
        response.setBefore(before);
        response.setAfter(after);
        response.setDelta(delta);
        return response;
    }

    private List<RoutePoint> deepCopyPoints(List<RoutePoint> points) {
        return points.stream().map(this::copyPoint).toList();
    }

    private RoutePoint copyPoint(RoutePoint p) {
        RoutePoint copy = new RoutePoint(p.getLat(), p.getLon(), p.getElevation(), p.getTimestamp());
        copy.setDistanceFromStart(p.getDistanceFromStart());
        copy.setSmoothedElevation(p.getSmoothedElevation());
        copy.setInterpolatedElevation(p.getInterpolatedElevation());
        return copy;
    }

    private double round2(double v) {
        return Math.round(v * 100.0) / 100.0;
    }
}
