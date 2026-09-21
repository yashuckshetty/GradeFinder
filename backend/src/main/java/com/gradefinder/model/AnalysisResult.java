package com.gradefinder.model;

import java.util.List;
import java.util.Map;

/**
 * Complete analysis result for a single route — the domain model, not a DTO.
 * Built by RouteAnalysisService after running all algorithm stages.
 */
public class AnalysisResult {

    // --- Summary statistics ---
    private double totalDistanceMeters;
    private double totalGainMeters;
    private double totalLossMeters;
    private double highestPointMeters;
    private double lowestPointMeters;
    private double avgGradePercent;

    // --- Core algorithm results ---
    private boolean hasSignificantClimb;
    private ClimbSegment maxClimbSegment;           // nullable
    private List<ClimbSegment> alternateMaxima;      // empty if no ties

    private boolean hasSignificantRecovery;
    private ClimbSegment maxRecoverySegment;         // nullable

    // --- Zone classification ---
    private List<RouteZone> zones;

    // --- Render data ---
    private List<RoutePoint> allPoints;              // full dataset for analysis reference
    private List<RoutePoint> renderPoints;           // downsampled for chart/3D

    // --- Transparency ---
    private List<String> warnings;
    private Map<String, Object> algorithmParameters; // echo back what was used

    // --- Route identity ---
    private String routeId;
    private String routeName;

    // Getters and setters
    public double getTotalDistanceMeters() { return totalDistanceMeters; }
    public void setTotalDistanceMeters(double v) { this.totalDistanceMeters = v; }

    public double getTotalGainMeters() { return totalGainMeters; }
    public void setTotalGainMeters(double v) { this.totalGainMeters = v; }

    public double getTotalLossMeters() { return totalLossMeters; }
    public void setTotalLossMeters(double v) { this.totalLossMeters = v; }

    public double getHighestPointMeters() { return highestPointMeters; }
    public void setHighestPointMeters(double v) { this.highestPointMeters = v; }

    public double getLowestPointMeters() { return lowestPointMeters; }
    public void setLowestPointMeters(double v) { this.lowestPointMeters = v; }

    public double getAvgGradePercent() { return avgGradePercent; }
    public void setAvgGradePercent(double v) { this.avgGradePercent = v; }

    public boolean isHasSignificantClimb() { return hasSignificantClimb; }
    public void setHasSignificantClimb(boolean v) { this.hasSignificantClimb = v; }

    public ClimbSegment getMaxClimbSegment() { return maxClimbSegment; }
    public void setMaxClimbSegment(ClimbSegment v) { this.maxClimbSegment = v; }

    public List<ClimbSegment> getAlternateMaxima() { return alternateMaxima; }
    public void setAlternateMaxima(List<ClimbSegment> v) { this.alternateMaxima = v; }

    public boolean isHasSignificantRecovery() { return hasSignificantRecovery; }
    public void setHasSignificantRecovery(boolean v) { this.hasSignificantRecovery = v; }

    public ClimbSegment getMaxRecoverySegment() { return maxRecoverySegment; }
    public void setMaxRecoverySegment(ClimbSegment v) { this.maxRecoverySegment = v; }

    public List<RouteZone> getZones() { return zones; }
    public void setZones(List<RouteZone> v) { this.zones = v; }

    public List<RoutePoint> getAllPoints() { return allPoints; }
    public void setAllPoints(List<RoutePoint> v) { this.allPoints = v; }

    public List<RoutePoint> getRenderPoints() { return renderPoints; }
    public void setRenderPoints(List<RoutePoint> v) { this.renderPoints = v; }

    public List<String> getWarnings() { return warnings; }
    public void setWarnings(List<String> v) { this.warnings = v; }

    public Map<String, Object> getAlgorithmParameters() { return algorithmParameters; }
    public void setAlgorithmParameters(Map<String, Object> v) { this.algorithmParameters = v; }

    public String getRouteId() { return routeId; }
    public void setRouteId(String v) { this.routeId = v; }

    public String getRouteName() { return routeName; }
    public void setRouteName(String v) { this.routeName = v; }
}
