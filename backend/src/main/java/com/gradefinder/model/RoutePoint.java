package com.gradefinder.model;

/**
 * A single track point from a GPX file, enriched with computed fields.
 * <p>
 * Raw fields (lat, lon, elevation, timestamp) come from parsing.
 * Computed fields (distanceFromStart, smoothedElevation) are set during preprocessing.
 * The raw elevation is retained for optional raw-vs-smoothed visualization toggling.
 */
public class RoutePoint {
    private final double lat;
    private final double lon;
    private final Double elevation;       // nullable — may be missing in source GPX
    private final String timestamp;       // nullable — ISO-8601 string if present

    private double distanceFromStart;     // meters, computed by DistanceCalculator
    private Double smoothedElevation;     // set by ElevationPreprocessor after smoothing
    private Double interpolatedElevation; // set if original was missing

    public RoutePoint(double lat, double lon, Double elevation, String timestamp) {
        this.lat = lat;
        this.lon = lon;
        this.elevation = elevation;
        this.timestamp = timestamp;
    }

    // --- Getters ---
    public double getLat() { return lat; }
    public double getLon() { return lon; }
    public Double getElevation() { return elevation; }
    public String getTimestamp() { return timestamp; }
    public double getDistanceFromStart() { return distanceFromStart; }
    public Double getSmoothedElevation() { return smoothedElevation; }
    public Double getInterpolatedElevation() { return interpolatedElevation; }

    /**
     * Returns the best-available elevation for this point:
     * smoothed > interpolated > raw.
     */
    public double getEffectiveElevation() {
        if (smoothedElevation != null) return smoothedElevation;
        if (interpolatedElevation != null) return interpolatedElevation;
        if (elevation != null) return elevation;
        return 0.0; // should never reach here after preprocessing
    }

    // --- Setters for computed fields ---
    public void setDistanceFromStart(double d) { this.distanceFromStart = d; }
    public void setSmoothedElevation(Double e) { this.smoothedElevation = e; }
    public void setInterpolatedElevation(Double e) { this.interpolatedElevation = e; }
}
