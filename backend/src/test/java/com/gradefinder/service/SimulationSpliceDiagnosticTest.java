package com.gradefinder.service;

import com.gradefinder.algorithm.DistanceCalculator;
import com.gradefinder.algorithm.ElevationPreprocessor;
import com.gradefinder.algorithm.ToleranceKadaneEngine;
import com.gradefinder.model.RoutePoint;
import com.gradefinder.parser.GpxParser;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Splice boundary diagnostic — resolves the Exercise 2 ambiguity.
 *
 * Question: when the simulation excludes points [0, 20] inclusive from
 * multi-climb (57 total points), the after-analysis reports maxClimb
 * startIndex=0. The original maxClimb started at index 22. With 21 points
 * removed, original index 22 should map to new index 1. So is startIndex=0
 * a legitimate smoothing boundary shift, or an off-by-one in the splice?
 *
 * This test:
 *  1. Parses multi-climb.gpx and prints all original raw elevations [0..24]
 *     and their post-smoothing values (window=5), so we can see the original
 *     climb boundary context.
 *  2. Manually performs the same splice (exclude [0,20] inclusive), then
 *     re-preprocesses and prints the first 8 smoothed elevations of the
 *     spliced array plus their deltas.
 *  3. Confirms the splice itself is inclusive on both ends (removes exactly
 *     21 points, leaving 36).
 *  4. Shows what the delta array looks like at new indices 0..5 so we can
 *     hand-verify whether delta[0] >= 0 (legitimate climb start) or < 0
 *     (algorithm should not start a climb there).
 *
 * Also audits mountain-climb fixture's grade.
 */
@DisplayName("Splice Boundary Diagnostic")
class SimulationSpliceDiagnosticTest {

    private static final double DESCENT_TOLERANCE = 3.0;
    private static final double MIN_GAIN          = 20.0;
    private static final double MIN_GRADE         =  1.5;
    private static final double MIN_STEP_DIST     =  0.5;
    private static final int    SMOOTH_WINDOW     =  5;
    private static final double MIN_ELE           = -500.0;
    private static final double MAX_ELE           =  9000.0;

    // ─────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Splice semantics: exclude [0,20] inclusive removes exactly 21 points")
    void spliceRemovesExact21Points() {
        List<RoutePoint> original = loadMultiClimb();

        System.out.printf("%n=== ORIGINAL ROUTE: %d points ===%n", original.size());

        // Perform the same splice as RouteSimulationService
        int excludeStart = 0;
        int excludeEnd   = 20;

        List<RoutePoint> spliced = new ArrayList<>();
        for (int i = 0; i < excludeStart; i++)             spliced.add(original.get(i));
        for (int i = excludeEnd + 1; i < original.size(); i++) spliced.add(original.get(i));

        System.out.printf("excludeStart=%d  excludeEnd=%d  (inclusive both ends)%n",
                excludeStart, excludeEnd);
        System.out.printf("Points removed: %d  (expected 21 = excludeEnd - excludeStart + 1)%n",
                original.size() - spliced.size());
        System.out.printf("Points remaining: %d  (expected %d)%n",
                spliced.size(), original.size() - 21);

        // ── Confirm semantics ──────────────────────────────────────────────
        assertEquals(57, original.size(), "multi-climb must have exactly 57 points");
        assertEquals(21, original.size() - spliced.size(),
                "Splice [0,20] inclusive must remove exactly 21 points");
        assertEquals(36, spliced.size(),
                "36 points must remain after removing 0..20 inclusive");

        // ── Confirm which original points map to which new indices ────────
        // Original index 21 → new index 0 (the valley floor, ele=510)
        // Original index 22 → new index 1 (first valley flat, ele=511)
        System.out.printf("%nIndex mapping after splice:%n");
        System.out.printf("  original[21] (ele=%.0f) → new[0]%n",
                original.get(21).getElevation());
        System.out.printf("  original[22] (ele=%.0f) → new[1]%n",
                original.get(22).getElevation());
        System.out.printf("  original[49] (ele=%.0f) → new[28]%n",
                original.get(49).getElevation());
        System.out.printf("  original[56] (ele=%.0f) → new[35]%n",
                original.get(56).getElevation());

        assertEquals(510.0, original.get(21).getElevation(), 1.0,
                "original[21] is the valley floor at ~510m");
        assertEquals(511.0, original.get(22).getElevation(), 1.0,
                "original[22] is the first valley flat point at ~511m");
    }

    // ─────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Post-splice smoothed deltas: confirm whether delta[0] >= 0 at new index 0")
    void postSpliceDeltaArrayDiagnostic() {
        List<RoutePoint> original = loadMultiClimb();

        // Splice: exclude [0,20] inclusive
        List<RoutePoint> spliced = new ArrayList<>();
        for (int i = 21; i < original.size(); i++) {
            RoutePoint op = original.get(i);
            RoutePoint copy = new RoutePoint(op.getLat(), op.getLon(),
                    op.getElevation(), op.getTimestamp());
            spliced.add(copy);
        }

        // Re-preprocess (interpolate → clamp → smooth) from scratch
        ElevationPreprocessor preprocessor = new ElevationPreprocessor();
        List<String> warnings = preprocessor.preprocess(spliced, SMOOTH_WINDOW, MIN_ELE, MAX_ELE);

        // Re-compute cumulative distances
        DistanceCalculator distCalc = new DistanceCalculator();
        double[] cumDist = distCalc.computeCumulativeDistances(spliced);

        // Print first 10 smoothed elevations and deltas
        System.out.printf("%n=== POST-SPLICE: first 10 points (smoothed) ===%n");
        System.out.printf("%-6s  %-8s  %-12s  %-12s  %-10s%n",
                "newIdx", "origIdx", "rawEle", "smoothedEle", "delta→next");
        for (int i = 0; i < Math.min(10, spliced.size()); i++) {
            int origIdx = i + 21; // because we started at original[21]
            double rawEle = spliced.get(i).getElevation() != null
                    ? spliced.get(i).getElevation() : Double.NaN;
            double smEle = spliced.get(i).getSmoothedElevation();
            double delta = i < spliced.size() - 1
                    ? spliced.get(i + 1).getSmoothedElevation() - smEle
                    : Double.NaN;
            System.out.printf("new[%2d]  orig[%2d]   raw=%-6.1f  smooth=%-8.4f  delta=%+.6f%n",
                    i, origIdx, rawEle, smEle, delta);
        }

        // ── KEY QUESTION: what is delta[0] (step from new[0] to new[1])? ──
        double delta0 = spliced.get(1).getSmoothedElevation()
                      - spliced.get(0).getSmoothedElevation();

        System.out.printf("%n=== BOUNDARY VERDICT ===%n");
        System.out.printf("delta[0] = smoothed[1] - smoothed[0] = %.4f%n", delta0);

        if (delta0 >= 0) {
            System.out.printf(
                "delta[0] >= 0: The Kadane engine WILL count new[0] as the climb start.%n" +
                "  → startIndex=0 is LEGITIMATE (not an off-by-one bug).%n" +
                "  → The smoothing window on the new array boundary pulled new[0] slightly%n" +
                "    lower than new[1], creating a non-negative step.%n");
        } else {
            System.out.printf(
                "delta[0] < 0: The Kadane engine will NOT start a climb at new[0].%n" +
                "  → startIndex=0 would be an off-by-one bug — investigate splice logic.%n");
        }

        // Now run the actual engine and confirm startIndex
        ToleranceKadaneEngine engine = new ToleranceKadaneEngine();
        ToleranceKadaneEngine.Result result = engine.findMaxClimb(
                spliced, cumDist, DESCENT_TOLERANCE, MIN_GAIN, MIN_GRADE, MIN_STEP_DIST);

        assertNotNull(result.getBestSegment(), "Post-splice route must have a significant climb");

        System.out.printf("%nEngine result on spliced array:%n");
        System.out.printf("  bestGain=%.2fm  startIndex=%d  endIndex=%d  grade=%.2f%%%n",
                result.getBestSegment().getGain(),
                result.getBestSegment().getStartIndex(),
                result.getBestSegment().getEndIndex(),
                result.getBestSegment().getAvgGrade());

        // The critical assertion: if delta[0] < 0, startIndex should be > 0 (specifically 1)
        // If delta[0] >= 0, startIndex == 0 is correct behavior
        int reportedStart = result.getBestSegment().getStartIndex();
        if (delta0 >= 0) {
            assertEquals(0, reportedStart,
                    "When delta[0]>=0, engine correctly starts at new[0] — NOT an off-by-one");
        } else {
            assertTrue(reportedStart > 0,
                    "When delta[0]<0, engine must skip new[0] — startIndex=0 would be a bug");
            assertEquals(1, reportedStart,
                    "When delta[0]<0, engine must skip new[0] and start at new[1] (original[22])");
        }
    }

    // ─────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Mountain-climb grade: confirm 19% is intentional (fixture designed to be steep)")
    void mountainClimbGradeAudit() throws Exception {
        List<RoutePoint> points = loadRoute("/demo-routes/mountain-climb.gpx");

        ElevationPreprocessor preprocessor = new ElevationPreprocessor();
        preprocessor.preprocess(points, SMOOTH_WINDOW, MIN_ELE, MAX_ELE);

        DistanceCalculator distCalc = new DistanceCalculator();
        double[] cumDist = distCalc.computeCumulativeDistances(points);

        ToleranceKadaneEngine engine = new ToleranceKadaneEngine();
        ToleranceKadaneEngine.Result result = engine.findMaxClimb(
                points, cumDist, DESCENT_TOLERANCE, MIN_GAIN, MIN_GRADE, MIN_STEP_DIST);

        assertNotNull(result.getBestSegment());
        double gainM    = result.getBestSegment().getGain();
        double gradePct = result.getBestSegment().getAvgGrade();
        double lengthM  = result.getBestSegment().getLength();
        double lengthKm = lengthM / 1000.0;

        System.out.printf("%n=== MOUNTAIN-CLIMB GRADE AUDIT ===%n");
        System.out.printf("gainM=%.2f  grade=%.2f%%  lengthKm=%.3f%n",
                gainM, gradePct, lengthKm);
        System.out.printf("Check: gain/length = %.2f/%.2f = %.2f%%%n",
                gainM, lengthKm * 1000.0, (gainM / (lengthKm * 1000.0)) * 100.0);

        // Print raw elevations of this fixture for audit
        System.out.printf("%nRaw elevation profile (all %d points):%n", points.size());
        for (int i = 0; i < points.size(); i++) {
            double rawEle = points.get(i).getElevation() != null
                    ? points.get(i).getElevation() : Double.NaN;
            System.out.printf("  [%2d] lat=%.4f  ele=%.0f  smoothed=%.2f%n",
                    i, points.get(i).getLat(), rawEle,
                    points.get(i).getSmoothedElevation());
        }

        System.out.printf("%nVERDICT: %.2f%% grade is %s for this fixture.%n",
                gradePct,
                gradePct > 15.0
                    ? "INTENTIONALLY STEEP (synthetic demo designed to test dramatic climb detection)"
                    : "within normal realistic bounds");

        // Grade must be > 15% (intentionally steep synthetic fixture)
        // and < 30% (not absurdly implausible for a hand-built GPX)
        assertTrue(gradePct > 15.0,
                "Mountain-climb is intentionally steep; grade should exceed 15%");
        assertTrue(gradePct < 30.0,
                "Grade should stay below 30% — even steep switchbacks rarely exceed this");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    private List<RoutePoint> loadMultiClimb() {
        return loadRoute("/demo-routes/multi-climb.gpx");
    }

    private List<RoutePoint> loadRoute(String resourcePath) {
        InputStream is = getClass().getResourceAsStream(resourcePath);
        assertNotNull(is, "Resource not found: " + resourcePath);
        GpxParser parser = new GpxParser();
        GpxParser.ParseResult result = parser.parse(is);
        assertFalse(result.getPoints().isEmpty(), "GPX must parse to non-empty point list");
        return new ArrayList<>(result.getPoints());
    }
}
