package com.gradefinder.algorithm;

import com.gradefinder.model.RoutePoint;

import java.util.List;

/**
 * Computes cumulative distances using the Haversine formula and provides
 * O(1) range-distance lookups via a prefix sum array, plus O(log n)
 * distance-to-index resolution via binary search.
 * <p>
 * The Haversine formula computes great-circle distance between two points
 * on a sphere — accurate enough for GPS track distances at any latitude.
 * Not the algorithmic core of the product, but a correctness-critical
 * supporting computation.
 */
public class DistanceCalculator {

    private static final double EARTH_RADIUS_METERS = 6_371_000.0;

    /**
     * Compute cumulative distances from start for all points.
     * Sets distanceFromStart on each RoutePoint. D[0] = 0.
     * Returns the prefix sum array for O(1) range queries.
     */
    public double[] computeCumulativeDistances(List<RoutePoint> points) {
        double[] cumDist = new double[points.size()];
        cumDist[0] = 0;
        points.get(0).setDistanceFromStart(0);

        for (int i = 1; i < points.size(); i++) {
            double d = haversine(
                    points.get(i - 1).getLat(), points.get(i - 1).getLon(),
                    points.get(i).getLat(), points.get(i).getLon()
            );
            cumDist[i] = cumDist[i - 1] + d;
            points.get(i).setDistanceFromStart(cumDist[i]);
        }

        return cumDist;
    }

    /**
     * Haversine formula: great-circle distance between two lat/lon points.
     *
     * @return distance in meters
     */
    public double haversine(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return EARTH_RADIUS_METERS * c;
    }

    /**
     * Binary search over a cumulative-distance array to find the index of the
     * point nearest to a given distance value. O(log n).
     * <p>
     * Used by both the 2D chart hover and 3D scene hover to resolve a
     * "user hovered at distance X" event to the nearest track point index.
     *
     * @param cumDist the sorted cumulative distance array
     * @param targetDistance the distance to look up (meters from start)
     * @return index of the nearest point
     */
    public int findNearestIndex(double[] cumDist, double targetDistance) {
        if (cumDist.length == 0) return 0;
        if (targetDistance <= cumDist[0]) return 0;
        if (targetDistance >= cumDist[cumDist.length - 1]) return cumDist.length - 1;

        int lo = 0, hi = cumDist.length - 1;
        while (lo < hi - 1) {
            int mid = lo + (hi - lo) / 2;
            if (cumDist[mid] <= targetDistance) {
                lo = mid;
            } else {
                hi = mid;
            }
        }

        // Return the closer of lo and hi
        return (targetDistance - cumDist[lo] <= cumDist[hi] - targetDistance) ? lo : hi;
    }

    /**
     * Get the distance of a segment from index start to index end.
     * O(1) using the prefix sum array.
     */
    public double segmentDistance(double[] cumDist, int startIndex, int endIndex) {
        return cumDist[endIndex] - cumDist[startIndex];
    }
}
