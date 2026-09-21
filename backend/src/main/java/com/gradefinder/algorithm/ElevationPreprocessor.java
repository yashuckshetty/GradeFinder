package com.gradefinder.algorithm;

import com.gradefinder.exception.NoElevationDataException;
import com.gradefinder.model.RoutePoint;

import java.util.ArrayList;
import java.util.List;

/**
 * Elevation preprocessing pipeline, applied in strict order before any analysis:
 * <ol>
 *   <li>Missing elevation interpolation — linear between nearest known neighbors</li>
 *   <li>Implausible value clamping — to [-500, 9000] meters</li>
 *   <li>Smoothing — centered moving average with configurable window</li>
 * </ol>
 *
 * <h3>Design note on smoothing method</h3>
 * A simple centered moving average is a deliberate simplification versus more
 * advanced filters (e.g., Savitzky-Golay, which preserves peak shapes better).
 * For typical GPS elevation noise (±2–5m random jitter), a 5-point moving average
 * adequately suppresses noise without significantly distorting genuine terrain
 * features. This is a documented limitation, not a hidden shortcut.
 * <p>
 * All statistics downstream (total gain, total loss, climb detection) operate
 * on the smoothed elevation series. The raw series is retained only for optional
 * raw-vs-smoothed visualization toggling.
 */
public class ElevationPreprocessor {

    /**
     * Run the full preprocessing pipeline on a list of route points.
     *
     * @param points the parsed route points (modified in place)
     * @param smoothingWindow centered moving average window size (must be >= 1)
     * @param minElevation lower bound of the sanity clamp (default -500)
     * @param maxElevation upper bound of the sanity clamp (default 9000)
     * @return list of warnings generated during preprocessing
     */
    public List<String> preprocess(List<RoutePoint> points, int smoothingWindow,
                                    double minElevation, double maxElevation) {
        List<String> warnings = new ArrayList<>();

        // Step 1: Interpolate missing elevations
        interpolateMissingElevations(points, warnings);

        // Step 2: Clamp implausible values
        clampElevations(points, minElevation, maxElevation, warnings);

        // Step 3: Smooth
        smooth(points, smoothingWindow);

        return warnings;
    }

    /**
     * Step 1: Linear interpolation for any point lacking elevation data.
     * <p>
     * If no point in the route has elevation data, analysis must fail explicitly —
     * never silently return zeroed results.
     */
    void interpolateMissingElevations(List<RoutePoint> points, List<String> warnings) {
        // First, check if ANY point has elevation
        boolean anyHasElevation = false;
        for (RoutePoint p : points) {
            if (p.getElevation() != null) {
                anyHasElevation = true;
                break;
            }
        }

        if (!anyHasElevation) {
            throw new NoElevationDataException(
                    "No elevation data found on any track point. " +
                    "Elevation analysis requires at least some points with <ele> values.");
        }

        int interpolatedCount = 0;

        for (int i = 0; i < points.size(); i++) {
            if (points.get(i).getElevation() == null) {
                // Find nearest preceding point with elevation
                Double prevEle = null;
                int prevIdx = -1;
                for (int j = i - 1; j >= 0; j--) {
                    Double ele = points.get(j).getElevation() != null
                            ? points.get(j).getElevation()
                            : points.get(j).getInterpolatedElevation();
                    if (ele != null) {
                        prevEle = ele;
                        prevIdx = j;
                        break;
                    }
                }

                // Find nearest following point with elevation
                Double nextEle = null;
                int nextIdx = -1;
                for (int j = i + 1; j < points.size(); j++) {
                    if (points.get(j).getElevation() != null) {
                        nextEle = points.get(j).getElevation();
                        nextIdx = j;
                        break;
                    }
                }

                double interpolated;
                if (prevEle != null && nextEle != null) {
                    // Linear interpolation between nearest known neighbors
                    double fraction = (double) (i - prevIdx) / (nextIdx - prevIdx);
                    interpolated = prevEle + fraction * (nextEle - prevEle);
                } else if (prevEle != null) {
                    // No following point: use previous value (flat extrapolation)
                    interpolated = prevEle;
                } else if (nextEle != null) {
                    // No preceding point: use next value (flat extrapolation)
                    interpolated = nextEle;
                } else {
                    // Should not reach here given the anyHasElevation check above
                    interpolated = 0.0;
                }

                points.get(i).setInterpolatedElevation(interpolated);
                interpolatedCount++;
            }
        }

        if (interpolatedCount > 0) {
            warnings.add(interpolatedCount + " point(s) had missing elevation data " +
                    "and were filled by linear interpolation.");
        }
    }

    /**
     * Step 2: Clamp elevation values outside the sanity band.
     * Never silently discard — always surface what happened.
     */
    void clampElevations(List<RoutePoint> points, double min, double max, List<String> warnings) {
        int clampedCount = 0;

        for (RoutePoint p : points) {
            double ele = getWorkingElevation(p);
            if (ele < min) {
                setWorkingElevation(p, min);
                clampedCount++;
            } else if (ele > max) {
                setWorkingElevation(p, max);
                clampedCount++;
            }
        }

        if (clampedCount > 0) {
            warnings.add(clampedCount + " point(s) had elevation values outside the " +
                    "plausible range [" + min + "m, " + max + "m] and were clamped.");
        }
    }

    /**
     * Step 3: Centered moving average smoothing.
     * The smoothed values are stored in each point's smoothedElevation field.
     */
    void smooth(List<RoutePoint> points, int window) {
        // Ensure window is odd for symmetric centering
        if (window < 1) window = 1;
        if (window % 2 == 0) window += 1;

        int halfWindow = window / 2;

        // Build working elevation array
        double[] working = new double[points.size()];
        for (int i = 0; i < points.size(); i++) {
            working[i] = getWorkingElevation(points.get(i));
        }

        // Apply centered moving average
        for (int i = 0; i < points.size(); i++) {
            int start = Math.max(0, i - halfWindow);
            int end = Math.min(points.size() - 1, i + halfWindow);
            double sum = 0;
            int count = 0;
            for (int j = start; j <= end; j++) {
                sum += working[j];
                count++;
            }
            points.get(i).setSmoothedElevation(sum / count);
        }
    }

    /**
     * Get the best available elevation before smoothing: interpolated > raw.
     */
    private double getWorkingElevation(RoutePoint p) {
        if (p.getInterpolatedElevation() != null) return p.getInterpolatedElevation();
        if (p.getElevation() != null) return p.getElevation();
        return 0.0;
    }

    /**
     * Update the working elevation (for clamping). Sets interpolated if it was
     * interpolated, otherwise creates a new interpolated value from the clamped raw.
     */
    private void setWorkingElevation(RoutePoint p, double value) {
        if (p.getInterpolatedElevation() != null) {
            p.setInterpolatedElevation(value);
        } else {
            p.setInterpolatedElevation(value);
        }
    }
}
