package com.gradefinder.algorithm;

import com.gradefinder.exception.NoElevationDataException;
import com.gradefinder.model.RoutePoint;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for {@link ElevationPreprocessor}.
 *
 * Coverage:
 *  1.  Linear interpolation for interior missing points
 *  2.  Forward extrapolation when no following point has elevation
 *  3.  Backward extrapolation when no preceding point has elevation
 *  4.  No elevation on any point → NoElevationDataException
 *  5.  All elevations present → no interpolation, no warning
 *  6.  Clamping: elevation below min clamped, warning emitted
 *  7.  Clamping: elevation above max clamped, warning emitted
 *  8.  Clamping: values in range untouched, no warning
 *  9.  Smoothing: window=1 is a no-op (identity)
 * 10.  Smoothing: window=3 averages correctly at interior and boundary points
 * 11.  Smoothing: even window is rounded up to next odd value
 * 12.  Full pipeline: interpolate → clamp → smooth, in that order
 */
@DisplayName("ElevationPreprocessor")
class ElevationPreprocessorTest {

    private ElevationPreprocessor preprocessor;

    @BeforeEach
    void setUp() {
        preprocessor = new ElevationPreprocessor();
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /** Build a RoutePoint with a known elevation. */
    private RoutePoint pt(double ele) {
        return new RoutePoint(0, 0, ele, null);
    }

    /** Build a RoutePoint with null elevation (missing). */
    private RoutePoint ptNoEle() {
        return new RoutePoint(0, 0, null, null);
    }

    private List<RoutePoint> listOf(RoutePoint... pts) {
        List<RoutePoint> list = new ArrayList<>();
        for (RoutePoint p : pts) list.add(p);
        return list;
    }

    /** The effective working elevation: interpolated > raw. */
    private double workingEle(RoutePoint p) {
        if (p.getInterpolatedElevation() != null) return p.getInterpolatedElevation();
        if (p.getElevation() != null) return p.getElevation();
        return 0;
    }

    // ── Test 1: Interior interpolation ───────────────────────────────────────

    @Test
    @DisplayName("Missing interior point is linearly interpolated between neighbors")
    void interpolation_interiorPoint() {
        List<RoutePoint> points = listOf(pt(100), ptNoEle(), pt(200));
        List<String> warnings = new ArrayList<>();

        preprocessor.interpolateMissingElevations(points, warnings);

        // Missing point at index 1: (0→2) → fraction = 1/2 → 100 + 0.5*(200-100) = 150
        assertEquals(150.0, workingEle(points.get(1)), 1e-9,
                "Interior missing point should be linearly interpolated");
        assertFalse(warnings.isEmpty(), "Should produce a warning about interpolation");
        assertTrue(warnings.get(0).contains("interpolation"));
    }

    @Test
    @DisplayName("Multiple consecutive missing points are all interpolated")
    void interpolation_multipleConsecutiveMissing() {
        // [0]=100, [1]=null, [2]=null, [3]=null, [4]=200
        // Fractions: 1/4=25%, 2/4=50%, 3/4=75%
        List<RoutePoint> points = listOf(pt(100), ptNoEle(), ptNoEle(), ptNoEle(), pt(200));
        List<String> warnings = new ArrayList<>();

        preprocessor.interpolateMissingElevations(points, warnings);

        assertEquals(125.0, workingEle(points.get(1)), 1e-6);
        assertEquals(150.0, workingEle(points.get(2)), 1e-6);
        assertEquals(175.0, workingEle(points.get(3)), 1e-6);
    }

    // ── Test 2: Forward extrapolation ────────────────────────────────────────

    @Test
    @DisplayName("Missing point at end is extrapolated from previous known elevation")
    void interpolation_trailingMissing() {
        // [0]=100, [1]=200, [2]=null, [3]=null
        List<RoutePoint> points = listOf(pt(100), pt(200), ptNoEle(), ptNoEle());
        List<String> warnings = new ArrayList<>();

        preprocessor.interpolateMissingElevations(points, warnings);

        // No following point with elevation → flat extrapolation from nearest preceding
        assertEquals(200.0, workingEle(points.get(2)), 1e-9);
        assertEquals(200.0, workingEle(points.get(3)), 1e-9);
    }

    // ── Test 3: Backward extrapolation ───────────────────────────────────────

    @Test
    @DisplayName("Missing points at start are extrapolated from first known elevation")
    void interpolation_leadingMissing() {
        // [0]=null, [1]=null, [2]=300
        List<RoutePoint> points = listOf(ptNoEle(), ptNoEle(), pt(300));
        List<String> warnings = new ArrayList<>();

        preprocessor.interpolateMissingElevations(points, warnings);

        // No preceding point → flat extrapolation from next elevation = 300
        assertEquals(300.0, workingEle(points.get(0)), 1e-9);
        assertEquals(300.0, workingEle(points.get(1)), 1e-9);
    }

    // ── Test 4: No elevation anywhere ────────────────────────────────────────

    @Test
    @DisplayName("No elevation data at all throws NoElevationDataException")
    void interpolation_noElevationAnywhere_throws() {
        List<RoutePoint> points = listOf(ptNoEle(), ptNoEle(), ptNoEle());
        List<String> warnings = new ArrayList<>();

        assertThrows(NoElevationDataException.class,
                () -> preprocessor.interpolateMissingElevations(points, warnings),
                "Must throw when no point has any elevation");
    }

    // ── Test 5: All elevations present ───────────────────────────────────────

    @Test
    @DisplayName("No missing elevations → no interpolation warning")
    void interpolation_allPresent_noWarning() {
        List<RoutePoint> points = listOf(pt(100), pt(200), pt(300));
        List<String> warnings = new ArrayList<>();

        preprocessor.interpolateMissingElevations(points, warnings);

        assertTrue(warnings.isEmpty(), "No warning expected when all elevations are present");
        // Raw elevation untouched
        assertEquals(100.0, points.get(0).getElevation(), 1e-9);
    }

    // ── Test 6: Clamping below min ───────────────────────────────────────────

    @Test
    @DisplayName("Elevation below min is clamped and warning emitted")
    void clamping_belowMin() {
        List<RoutePoint> points = listOf(pt(-600));
        List<String> warnings = new ArrayList<>();

        preprocessor.clampElevations(points, -500, 9000, warnings);

        // After clamping, interpolatedElevation should be set to min
        assertEquals(-500.0, workingEle(points.get(0)), 1e-9,
                "Sub-minimum elevation should be clamped to -500");
        assertFalse(warnings.isEmpty());
        assertTrue(warnings.get(0).contains("clamped"));
    }

    // ── Test 7: Clamping above max ───────────────────────────────────────────

    @Test
    @DisplayName("Elevation above max is clamped and warning emitted")
    void clamping_aboveMax() {
        List<RoutePoint> points = listOf(pt(9500));
        List<String> warnings = new ArrayList<>();

        preprocessor.clampElevations(points, -500, 9000, warnings);

        assertEquals(9000.0, workingEle(points.get(0)), 1e-9,
                "Above-maximum elevation should be clamped to 9000");
        assertFalse(warnings.isEmpty());
    }

    // ── Test 8: Values in range untouched ────────────────────────────────────

    @Test
    @DisplayName("Elevations within valid range are not modified")
    void clamping_inRange_noChange() {
        List<RoutePoint> points = listOf(pt(100), pt(500), pt(8848));
        List<String> warnings = new ArrayList<>();

        preprocessor.clampElevations(points, -500, 9000, warnings);

        assertEquals(100.0, points.get(0).getElevation(), 1e-9);
        assertEquals(500.0, points.get(1).getElevation(), 1e-9);
        assertEquals(8848.0, points.get(2).getElevation(), 1e-9);
        assertTrue(warnings.isEmpty(), "No warning expected when all values are in range");
    }

    // ── Test 9: Smoothing window=1 is a no-op ────────────────────────────────

    @Test
    @DisplayName("Smoothing with window=1 leaves each elevation unchanged")
    void smoothing_windowOne_isIdentity() {
        List<RoutePoint> points = listOf(pt(100), pt(200), pt(150), pt(300));
        preprocessor.smooth(points, 1);

        assertEquals(100.0, points.get(0).getSmoothedElevation(), 1e-9);
        assertEquals(200.0, points.get(1).getSmoothedElevation(), 1e-9);
        assertEquals(150.0, points.get(2).getSmoothedElevation(), 1e-9);
        assertEquals(300.0, points.get(3).getSmoothedElevation(), 1e-9);
    }

    // ── Test 10: Smoothing window=3 ──────────────────────────────────────────

    @Test
    @DisplayName("Smoothing window=3: interior points average 3 neighbors, boundary 2")
    void smoothing_windowThree_correctAverages() {
        // Points: 100, 200, 300, 400, 500
        // Window 3, half=1:
        //   idx 0: [0..1]  = (100+200)/2 = 150
        //   idx 1: [0..2]  = (100+200+300)/3 = 200
        //   idx 2: [1..3]  = (200+300+400)/3 = 300
        //   idx 3: [2..4]  = (300+400+500)/3 = 400
        //   idx 4: [3..4]  = (400+500)/2 = 450
        List<RoutePoint> points = listOf(pt(100), pt(200), pt(300), pt(400), pt(500));
        preprocessor.smooth(points, 3);

        assertEquals(150.0, points.get(0).getSmoothedElevation(), 1e-9, "Boundary left");
        assertEquals(200.0, points.get(1).getSmoothedElevation(), 1e-9, "Interior");
        assertEquals(300.0, points.get(2).getSmoothedElevation(), 1e-9, "Interior");
        assertEquals(400.0, points.get(3).getSmoothedElevation(), 1e-9, "Interior");
        assertEquals(450.0, points.get(4).getSmoothedElevation(), 1e-9, "Boundary right");
    }

    // ── Test 11: Even window rounded up ──────────────────────────────────────

    @Test
    @DisplayName("Even smoothing window is rounded up to next odd value (4→5)")
    void smoothing_evenWindow_roundedUp() {
        // If window=4 is rounded to 5, half=2, the center point (idx 2)
        // should average [0..4] = (10+20+30+40+50)/5 = 30.
        // If window stayed 4 (half=2, asymmetric), behavior would differ.
        // We verify idx=2 equals 30.0 (the correct 5-point average).
        List<RoutePoint> points = listOf(pt(10), pt(20), pt(30), pt(40), pt(50));
        preprocessor.smooth(points, 4); // must be rounded to 5

        assertEquals(30.0, points.get(2).getSmoothedElevation(), 1e-9,
                "Center point should average all 5 (window 4→5)");
    }

    // ── Test 12: Full pipeline ────────────────────────────────────────────────

    @Test
    @DisplayName("Full pipeline: interpolate → clamp → smooth applied in order")
    void fullPipeline_correctOrder() {
        // Point 0: ele=100 (valid)
        // Point 1: no ele (will be interpolated to 600 → then clamped to max 500 → then smoothed)
        // Point 2: ele=1100 (will be clamped to 500 → then smoothed)
        // We use min=-500, max=500 to make clamping visible
        List<RoutePoint> points = listOf(pt(100), ptNoEle(), pt(1100));

        List<String> warnings = preprocessor.preprocess(points, 1, -500.0, 500.0);

        // Point 1 should have been interpolated to 600 and then clamped to 500
        // Point 2 should have been clamped from 1100 to 500
        // With window=1, smoothing is identity → smoothedElevation = workingElevation

        assertTrue(warnings.stream().anyMatch(w -> w.contains("interpolation")),
                "Should warn about interpolation");
        assertTrue(warnings.stream().anyMatch(w -> w.contains("clamped")),
                "Should warn about clamping");

        // After pipeline, smoothedElevation is set on all points
        assertNotNull(points.get(0).getSmoothedElevation());
        assertNotNull(points.get(1).getSmoothedElevation());
        assertNotNull(points.get(2).getSmoothedElevation());

        // Clamping should have applied to points 1 and 2 (both > 500 before clamp)
        assertTrue(points.get(1).getSmoothedElevation() <= 500.0,
                "Interpolated+clamped point must be ≤ max elevation");
        assertTrue(points.get(2).getSmoothedElevation() <= 500.0,
                "Clamped point must be ≤ max elevation");
    }
}
