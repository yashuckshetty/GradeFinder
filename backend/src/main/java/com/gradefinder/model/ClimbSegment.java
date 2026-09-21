package com.gradefinder.model;

/**
 * Represents a detected significant segment (climb or recovery).
 * All fields are computed by ToleranceKadaneEngine and are immutable once set.
 *
 * <p><b>Net Gain vs. Cumulative Ascent:</b></p>
 * <ul>
 *   <li>{@code gain}: The net elevation difference between segment start and end
 *       ({@code E[end] - E[start]}). This preserves the telescoping property
 *       where the net gain equals the sum of all step deltas across the segment,
 *       including any minor dips absorbed within tolerance.</li>
 *   <li>{@code totalAscentM}: The cumulative sum of all strictly positive elevation deltas
 *       ({@code sum(delta[i]) for delta[i] > 0}) within the segment window.
 *       This reflects the total vertical ascent performed by an athlete, ignoring
 *       descending dip meters.</li>
 * </ul>
 */
public class ClimbSegment {
    private final int startIndex;
    private final int endIndex;
    private final double startDistance;  // meters from route start
    private final double endDistance;
    private final double gain;           // net elevation gain in meters (positive for climbs)
    private final double avgGrade;       // average grade as percentage
    private final double length;         // horizontal distance of the segment in meters
    private final double totalAscentM;   // cumulative ascent summing all positive deltas (meters)

    public ClimbSegment(int startIndex, int endIndex, double startDistance,
                        double endDistance, double gain, double avgGrade, double length,
                        double totalAscentM) {
        this.startIndex = startIndex;
        this.endIndex = endIndex;
        this.startDistance = startDistance;
        this.endDistance = endDistance;
        this.gain = gain;
        this.avgGrade = avgGrade;
        this.length = length;
        this.totalAscentM = totalAscentM;
    }

    public ClimbSegment(int startIndex, int endIndex, double startDistance,
                        double endDistance, double gain, double avgGrade, double length) {
        this(startIndex, endIndex, startDistance, endDistance, gain, avgGrade, length, gain);
    }

    public int getStartIndex() { return startIndex; }
    public int getEndIndex() { return endIndex; }
    public double getStartDistance() { return startDistance; }
    public double getEndDistance() { return endDistance; }
    public double getGain() { return gain; }
    public double getAvgGrade() { return avgGrade; }
    public double getLength() { return length; }
    public double getTotalAscentM() { return totalAscentM; }
}

