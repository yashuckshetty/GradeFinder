package com.gradefinder.algorithm;

import com.gradefinder.model.RoutePoint;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for {@link DistanceCalculator}.
 *
 * Coverage:
 *  1. Haversine: known distance (Paris → London ≈ 341 km)
 *  2. Haversine: same point → zero distance
 *  3. Haversine: equatorial point pair → roughly 1.11 km per 0.01°
 *  4. Haversine: antipodal points → ≈ 20,015 km (half Earth circumference)
 *  5. cumulative distances: D[0] = 0, D[n-1] = total distance
 *  6. cumulative distances: strictly non-decreasing for a valid route
 *  7. segmentDistance: O(1) range query correctness
 *  8. findNearestIndex: target at exact start → index 0
 *  9. findNearestIndex: target at exact end → last index
 * 10. findNearestIndex: target in middle → nearest by distance
 * 11. findNearestIndex: empty array → returns 0
 */
@DisplayName("DistanceCalculator")
class DistanceCalculatorTest {

    private DistanceCalculator calc;

    @BeforeEach
    void setUp() {
        calc = new DistanceCalculator();
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private RoutePoint pt(double lat, double lon) {
        RoutePoint p = new RoutePoint(lat, lon, 0.0, null);
        p.setSmoothedElevation(0.0);
        return p;
    }

    // ── Test 1: Haversine known distance ─────────────────────────────────────

    @Test
    @DisplayName("Haversine: Paris to London ≈ 341 km (within 5 km)")
    void haversine_parisToLondon() {
        // Paris: 48.8566°N, 2.3522°E
        // London: 51.5074°N, -0.1278°E
        double dist = calc.haversine(48.8566, 2.3522, 51.5074, -0.1278);
        // Expected: ~341 km; allow ±5 km for spherical vs. ellipsoidal difference
        assertEquals(341_000.0, dist, 5_000.0,
                "Paris→London should be approximately 341 km");
    }

    // ── Test 2: Same-point distance ──────────────────────────────────────────

    @Test
    @DisplayName("Haversine: same point → exactly 0 meters")
    void haversine_samePoint_zero() {
        double dist = calc.haversine(47.0, 8.0, 47.0, 8.0);
        assertEquals(0.0, dist, 1e-9, "Same point should return zero distance");
    }

    // ── Test 3: Equatorial step ──────────────────────────────────────────────

    @Test
    @DisplayName("Haversine: 0.01° longitude step on equator ≈ 1,111 m (within 5 m)")
    void haversine_equatorialStep() {
        // At the equator, 1° longitude ≈ 111.19 km, so 0.01° ≈ 1,111.9 m
        double dist = calc.haversine(0.0, 0.0, 0.0, 0.01);
        assertEquals(1_111.9, dist, 5.0,
                "0.01° longitude on equator should be ~1,112 m");
    }

    // ── Test 4: Antipodal points ─────────────────────────────────────────────

    @Test
    @DisplayName("Haversine: antipodal points ≈ 20,015 km (half Earth circumference)")
    void haversine_antipodalPoints() {
        double dist = calc.haversine(0.0, 0.0, 0.0, 180.0);
        // Half circumference of Earth: π × R ≈ 20,015 km
        assertEquals(20_015_000.0, dist, 50_000.0,
                "Antipodal points should be ~20,015 km apart");
    }

    // ── Test 5: Cumulative distances start/end ────────────────────────────────

    @Test
    @DisplayName("computeCumulativeDistances: D[0]=0, D[n-1]=total")
    void cumulative_startZeroEndTotal() {
        List<RoutePoint> points = List.of(
                pt(47.0, 8.0),
                pt(47.001, 8.0),
                pt(47.002, 8.0)
        );

        double[] cumDist = calc.computeCumulativeDistances(points);

        assertEquals(3, cumDist.length);
        assertEquals(0.0, cumDist[0], 1e-9, "First point must be 0");
        assertTrue(cumDist[2] > 0, "Last point must be positive");
        assertEquals(points.get(2).getDistanceFromStart(), cumDist[2], 1e-9,
                "distanceFromStart must match array value");
    }

    // ── Test 6: Strictly non-decreasing ──────────────────────────────────────

    @Test
    @DisplayName("computeCumulativeDistances: array is strictly non-decreasing")
    void cumulative_nonDecreasing() {
        List<RoutePoint> points = List.of(
                pt(47.0, 8.0),
                pt(47.001, 8.001),
                pt(47.002, 8.002),
                pt(47.003, 8.003)
        );

        double[] cumDist = calc.computeCumulativeDistances(points);

        for (int i = 1; i < cumDist.length; i++) {
            assertTrue(cumDist[i] >= cumDist[i - 1],
                    "cumDist must be non-decreasing at index " + i);
        }
    }

    // ── Test 7: segmentDistance ──────────────────────────────────────────────

    @Test
    @DisplayName("segmentDistance: O(1) query returns cumDist[end] − cumDist[start]")
    void segmentDistance_correctSubtraction() {
        // cumDist = {0, 100, 250, 400}
        // [0..2] = 250 - 0   = 250m  ✓
        // [1..3] = 400 - 100 = 300m  ✓  (not 150 — that was an arithmetic error in the test)
        // [2..2] = 250 - 250 = 0m    ✓  (degenerate)
        // [0..1] = 100 - 0   = 100m  ✓
        double[] cumDist = {0.0, 100.0, 250.0, 400.0};

        assertEquals(250.0, calc.segmentDistance(cumDist, 0, 2), 1e-9,
                "Segment [0..2] should be 250m");
        assertEquals(300.0, calc.segmentDistance(cumDist, 1, 3), 1e-9,
                "Segment [1..3] should be 300m (400-100)");
        assertEquals(0.0, calc.segmentDistance(cumDist, 2, 2), 1e-9,
                "Degenerate segment [2..2] should be 0m");
        assertEquals(100.0, calc.segmentDistance(cumDist, 0, 1), 1e-9,
                "Segment [0..1] should be 100m");
    }

    // ── Test 8: findNearestIndex at start ────────────────────────────────────

    @Test
    @DisplayName("findNearestIndex: target at or before start → index 0")
    void findNearest_atStart() {
        double[] cumDist = {0.0, 100.0, 200.0, 300.0};

        assertEquals(0, calc.findNearestIndex(cumDist, 0.0), "Exact start");
        assertEquals(0, calc.findNearestIndex(cumDist, -50.0), "Before start");
    }

    // ── Test 9: findNearestIndex at end ──────────────────────────────────────

    @Test
    @DisplayName("findNearestIndex: target at or beyond end → last index")
    void findNearest_atEnd() {
        double[] cumDist = {0.0, 100.0, 200.0, 300.0};

        assertEquals(3, calc.findNearestIndex(cumDist, 300.0), "Exact end");
        assertEquals(3, calc.findNearestIndex(cumDist, 9999.0), "Beyond end");
    }

    // ── Test 10: findNearestIndex in middle ──────────────────────────────────

    @Test
    @DisplayName("findNearestIndex: target in middle returns nearest by value")
    void findNearest_middle() {
        double[] cumDist = {0.0, 100.0, 200.0, 300.0};

        // 140.0 is closer to 100 (diff=40) than to 200 (diff=60)
        assertEquals(1, calc.findNearestIndex(cumDist, 140.0),
                "140m should snap to index 1 (100m is closer than 200m)");

        // 160.0 is closer to 200 (diff=40) than to 100 (diff=60)
        assertEquals(2, calc.findNearestIndex(cumDist, 160.0),
                "160m should snap to index 2 (200m is closer than 100m)");

        // 150.0 is equidistant — implementation returns the lower (lo)
        // This is defined behavior: lo wins on tie by the binary-search invariant.
        int idx = calc.findNearestIndex(cumDist, 150.0);
        assertTrue(idx == 1 || idx == 2, "150m tie: must return either neighboring index");
    }

    // ── Test 11: Empty array ──────────────────────────────────────────────────

    @Test
    @DisplayName("findNearestIndex: empty cumDist array → returns 0 (no crash)")
    void findNearest_emptyArray() {
        double[] cumDist = {};
        assertEquals(0, calc.findNearestIndex(cumDist, 100.0),
                "Empty array should return 0 without throwing");
    }

    // ── Bonus: distanceFromStart set on points ────────────────────────────────

    @Test
    @DisplayName("computeCumulativeDistances sets distanceFromStart on each RoutePoint")
    void cumulative_setsDistanceFromStart() {
        RoutePoint p0 = pt(47.0, 8.0);
        RoutePoint p1 = pt(47.001, 8.0);
        RoutePoint p2 = pt(47.002, 8.0);

        double[] cumDist = calc.computeCumulativeDistances(List.of(p0, p1, p2));

        assertEquals(0.0, p0.getDistanceFromStart(), 1e-9);
        assertEquals(cumDist[1], p1.getDistanceFromStart(), 1e-9);
        assertEquals(cumDist[2], p2.getDistanceFromStart(), 1e-9);
    }
}
