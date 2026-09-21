package com.gradefinder.algorithm;

import com.gradefinder.model.RoutePoint;
import com.gradefinder.model.RouteZone;
import com.gradefinder.model.ZoneType;

import java.util.ArrayList;
import java.util.List;

/**
 * Classifies every point in a route into one of {CLIMBING, DESCENDING, FLAT}
 * using a dead-band to avoid flickering classification from noise.
 * <p>
 * This is simple linear classification — a supporting derived statistic,
 * not a DSA feature. Do not oversell it as such.
 */
public class SegmentClassifier {

    /** Grade threshold (%) — grades within ±this value are classified as FLAT. */
    private static final double DEAD_BAND_PERCENT = 0.5;

    /**
     * Classify each point-to-point step and merge consecutive steps of the
     * same type into contiguous zones.
     *
     * @param points  preprocessed route points with smoothed elevations
     * @param cumDist cumulative distance array
     * @param minStepDistance minimum step distance to compute meaningful grade
     * @return list of classified zones
     */
    public List<RouteZone> classify(List<RoutePoint> points, double[] cumDist,
                                     double minStepDistance) {
        if (points.size() < 2) {
            return List.of();
        }

        List<RouteZone> zones = new ArrayList<>();
        ZoneType currentType = null;
        int currentStart = 0;

        for (int i = 0; i < points.size() - 1; i++) {
            double stepDist = cumDist[i + 1] - cumDist[i];
            ZoneType type;

            if (stepDist < minStepDistance) {
                // Too close together to determine grade — assume flat (or carry forward)
                type = currentType != null ? currentType : ZoneType.FLAT;
            } else {
                double deltaEle = points.get(i + 1).getSmoothedElevation()
                                - points.get(i).getSmoothedElevation();
                double grade = (deltaEle / stepDist) * 100.0;

                if (grade > DEAD_BAND_PERCENT) {
                    type = ZoneType.CLIMBING;
                } else if (grade < -DEAD_BAND_PERCENT) {
                    type = ZoneType.DESCENDING;
                } else {
                    type = ZoneType.FLAT;
                }
            }

            if (currentType == null) {
                currentType = type;
                currentStart = i;
            } else if (type != currentType) {
                zones.add(new RouteZone(currentStart, i, currentType));
                currentType = type;
                currentStart = i;
            }
        }

        // Final zone
        if (currentType != null) {
            zones.add(new RouteZone(currentStart, points.size() - 1, currentType));
        }

        return zones;
    }
}
