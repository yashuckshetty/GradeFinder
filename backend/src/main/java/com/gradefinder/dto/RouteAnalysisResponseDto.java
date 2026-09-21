package com.gradefinder.dto;

import java.util.List;
import java.util.Map;

/**
 * API response DTO for a route analysis.
 * Mirrors the domain AnalysisResult but is shaped for JSON serialization.
 */
public class RouteAnalysisResponseDto {

    // Identity
    private String routeId;
    private String routeName;

    // Summary statistics
    private SummaryDto summary;

    // Core results
    private boolean hasSignificantClimb;
    private SegmentDto maxClimbSegment;     // nullable
    private List<SegmentDto> alternateMaxima;

    private boolean hasSignificantRecovery;
    private SegmentDto maxRecoverySegment;  // nullable

    // Zones
    private List<ZoneDto> zones;

    // Render data — downsampled for chart/3D
    private List<PointDto> renderPoints;

    // Transparency
    private List<String> warnings;
    private Map<String, Object> algorithmParameters;

    // Explanatory message for edge cases (e.g., flat route)
    private String message;

    // --- Inner DTOs ---

    public static class SummaryDto {
        private double distanceKm;
        private double totalGainM;
        private double totalLossM;
        private double highestPointM;
        private double lowestPointM;
        private double avgGradePercent;

        // Getters and setters
        public double getDistanceKm() { return distanceKm; }
        public void setDistanceKm(double v) { this.distanceKm = v; }
        public double getTotalGainM() { return totalGainM; }
        public void setTotalGainM(double v) { this.totalGainM = v; }
        public double getTotalLossM() { return totalLossM; }
        public void setTotalLossM(double v) { this.totalLossM = v; }
        public double getHighestPointM() { return highestPointM; }
        public void setHighestPointM(double v) { this.highestPointM = v; }
        public double getLowestPointM() { return lowestPointM; }
        public void setLowestPointM(double v) { this.lowestPointM = v; }
        public double getAvgGradePercent() { return avgGradePercent; }
        public void setAvgGradePercent(double v) { this.avgGradePercent = v; }
    }

    public static class SegmentDto {
        private int startIndex;
        private int endIndex;
        private double startDistanceKm;
        private double endDistanceKm;
        private double gainM;
        private double avgGradePercent;
        private double lengthKm;
        private double totalAscentM;
        private double totalDescentM;
        private boolean overlapsWithClimb;

        // Getters and setters
        public int getStartIndex() { return startIndex; }
        public void setStartIndex(int v) { this.startIndex = v; }
        public int getEndIndex() { return endIndex; }
        public void setEndIndex(int v) { this.endIndex = v; }
        public double getStartDistanceKm() { return startDistanceKm; }
        public void setStartDistanceKm(double v) { this.startDistanceKm = v; }
        public double getEndDistanceKm() { return endDistanceKm; }
        public void setEndDistanceKm(double v) { this.endDistanceKm = v; }
        public double getGainM() { return gainM; }
        public void setGainM(double v) { this.gainM = v; }
        public double getAvgGradePercent() { return avgGradePercent; }
        public void setAvgGradePercent(double v) { this.avgGradePercent = v; }
        public double getLengthKm() { return lengthKm; }
        public void setLengthKm(double v) { this.lengthKm = v; }
        public double getTotalAscentM() { return totalAscentM; }
        public void setTotalAscentM(double v) { this.totalAscentM = v; }
        public double getTotalDescentM() { return totalDescentM; }
        public void setTotalDescentM(double v) { this.totalDescentM = v; }
        public boolean isOverlapsWithClimb() { return overlapsWithClimb; }
        public void setOverlapsWithClimb(boolean v) { this.overlapsWithClimb = v; }
    }

    public static class ZoneDto {
        private int startIndex;
        private int endIndex;
        private String type; // CLIMBING, DESCENDING, FLAT

        public int getStartIndex() { return startIndex; }
        public void setStartIndex(int v) { this.startIndex = v; }
        public int getEndIndex() { return endIndex; }
        public void setEndIndex(int v) { this.endIndex = v; }
        public String getType() { return type; }
        public void setType(String v) { this.type = v; }
    }

    public static class PointDto {
        private int index;
        private double lat;
        private double lon;
        private double elevationM;
        private double smoothedElevationM;
        private double distanceKm;

        public int getIndex() { return index; }
        public void setIndex(int v) { this.index = v; }
        public double getLat() { return lat; }
        public void setLat(double v) { this.lat = v; }
        public double getLon() { return lon; }
        public void setLon(double v) { this.lon = v; }
        public double getElevationM() { return elevationM; }
        public void setElevationM(double v) { this.elevationM = v; }
        public double getSmoothedElevationM() { return smoothedElevationM; }
        public void setSmoothedElevationM(double v) { this.smoothedElevationM = v; }
        public double getDistanceKm() { return distanceKm; }
        public void setDistanceKm(double v) { this.distanceKm = v; }
    }

    // --- Top-level getters and setters ---
    public String getRouteId() { return routeId; }
    public void setRouteId(String v) { this.routeId = v; }
    public String getRouteName() { return routeName; }
    public void setRouteName(String v) { this.routeName = v; }
    public SummaryDto getSummary() { return summary; }
    public void setSummary(SummaryDto v) { this.summary = v; }
    public boolean isHasSignificantClimb() { return hasSignificantClimb; }
    public void setHasSignificantClimb(boolean v) { this.hasSignificantClimb = v; }
    public SegmentDto getMaxClimbSegment() { return maxClimbSegment; }
    public void setMaxClimbSegment(SegmentDto v) { this.maxClimbSegment = v; }
    public List<SegmentDto> getAlternateMaxima() { return alternateMaxima; }
    public void setAlternateMaxima(List<SegmentDto> v) { this.alternateMaxima = v; }
    public boolean isHasSignificantRecovery() { return hasSignificantRecovery; }
    public void setHasSignificantRecovery(boolean v) { this.hasSignificantRecovery = v; }
    public SegmentDto getMaxRecoverySegment() { return maxRecoverySegment; }
    public void setMaxRecoverySegment(SegmentDto v) { this.maxRecoverySegment = v; }
    public List<ZoneDto> getZones() { return zones; }
    public void setZones(List<ZoneDto> v) { this.zones = v; }
    public List<PointDto> getRenderPoints() { return renderPoints; }
    public void setRenderPoints(List<PointDto> v) { this.renderPoints = v; }
    public List<String> getWarnings() { return warnings; }
    public void setWarnings(List<String> v) { this.warnings = v; }
    public Map<String, Object> getAlgorithmParameters() { return algorithmParameters; }
    public void setAlgorithmParameters(Map<String, Object> v) { this.algorithmParameters = v; }
    public String getMessage() { return message; }
    public void setMessage(String v) { this.message = v; }
}
