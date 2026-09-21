package com.gradefinder.algorithm;

import com.gradefinder.model.ClimbSegment;
import com.gradefinder.model.RoutePoint;
import com.gradefinder.model.RouteZone;
import com.gradefinder.model.ZoneType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Phase 3 — ToleranceKadaneEngine and SegmentClassifier unit tests.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * HAND-VERIFICATION CASES (run first, per user requirement)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * CASE A: delta=[+5,+5,+5,-1,-1,+6,+6,+6], tolerance=3
 *   → one continuous climb; both -1 dips absorbed (cumDesc=1, then 2 ≤ 3)
 *   → bestGain=31, bestStart=0, bestEnd=8, 0 finalised mid-loop segments
 *
 * CASE B: delta=[+5,+5,+5,-2,-2,+6,+6,+6], tolerance=3
 *   → two distinct segments; second -2 pushes cumDesc to 4 > 3 → restart
 *   Walk-through:
 *     i=0: d=+5 → gain=5,  peakEnd=1, desc=0
 *     i=1: d=+5 → gain=10, peakEnd=2, desc=0
 *     i=2: d=+5 → gain=15, peakEnd=3, desc=0
 *     i=3: d=-2 → desc=2 ≤ 3 → gain=13              (absorbed)
 *     i=4: d=-2 → desc=4 > 3 → RESTART
 *                  finalise candidate(start=0, end=3, gain=13)
 *                  restart: start=5, gain=0, desc=0, peakEnd=5
 *     i=5: d=+6 → gain=6,  peakEnd=6, desc=0
 *     i=6: d=+6 → gain=12, peakEnd=7, desc=0
 *     i=7: d=+6 → gain=18, peakEnd=8, desc=0
 *   Post-loop: finalise (start=5, end=8, gain=18)
 *   → bestGain=18, bestStart=5, bestEnd=8
 *   → allCandidates: [(0,3,13), (5,8,18)] → 2 candidates total
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ToleranceKadaneEngine cases:
 *  A. Hand-verification: tolerance absorbs [-1,-1] → one climb (gain=31)
 *  B. Hand-verification: [-2,-2] exceeds tolerance → two climbs, best=18
 *  C. Single unbroken climb (no dips)
 *  D. All flat route → no significant climb, isSignificant=false
 *  E. All descending → no significant climb, isSignificant=false
 *  F. Two equal-gain segments (tie) → alternateMaxima populated
 *  G. Empty points list → null best segment, no crash
 *  H. Single point (n<2) → null best segment, no crash
 *  I. Short but steep climb → significant=true when both thresholds met
 *  J. Recovery detection (negate=true) on Case B array → finds the descent
 *
 * SegmentClassifier cases:
 *  K. Pure climbing steps → single CLIMBING zone
 *  L. Pure descending steps → single DESCENDING zone
 *  M. Mixed: climb, flat, descend → three zones in order
 *  N. Dead-band: grade < +0.5% → FLAT (not CLIMBING)
 *  O. Dead-band: grade < -0.5% in magnitude → FLAT (not DESCENDING)
 *  P. Fewer than 2 points → empty zone list, no crash
 *  Q. Steps too short for grade → treated as continuation (flat carry-forward)
 */
@DisplayName("ToleranceKadaneEngine + SegmentClassifier")
class ToleranceKadaneEngineTest {

    private ToleranceKadaneEngine engine;
    private SegmentClassifier classifier;

    // Significance thresholds — low enough that most test cases pass without
    // needing large routes, but distinct enough to test the threshold logic.
    private static final double MIN_GAIN  = 5.0;   // 5m minimum gain
    private static final double MIN_GRADE = 0.5;   // 0.5% minimum grade
    private static final double MIN_STEP  = 0.1;   // 10cm minimum step (effectively always valid)
    private static final double TOLERANCE = 3.0;   // descent tolerance: 3m

    @BeforeEach
    void setUp() {
        engine     = new ToleranceKadaneEngine();
        classifier = new SegmentClassifier();
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /**
     * Build a list of RoutePoints whose smoothedElevation is derived from an
     * initial elevation plus the running cumulative sum of the delta array.
     *
     * Points are placed 100m apart (horizontal) so grade is always computable.
     */
    private List<RoutePoint> pointsFromDeltas(double[] deltas) {
        List<RoutePoint> pts = new ArrayList<>();
        double ele = 500.0;
        for (int i = 0; i <= deltas.length; i++) {
            RoutePoint p = new RoutePoint(47.0 + i * 0.001, 8.0, ele, null);
            p.setSmoothedElevation(ele);
            p.setDistanceFromStart(i * 100.0);
            pts.add(p);
            if (i < deltas.length) ele += deltas[i];
        }
        return pts;
    }

    /**
     * Build a uniform cumulative distance array: every point is stepM meters apart.
     */
    private double[] uniformCumDist(int nPoints, double stepM) {
        double[] d = new double[nPoints];
        for (int i = 0; i < nPoints; i++) d[i] = i * stepM;
        return d;
    }

    // ── ════════════════════════════════════════════════════════════════════ ──
    // HAND-VERIFICATION CASES — run and print real numbers first
    // ── ════════════════════════════════════════════════════════════════════ ──

    /**
     * CASE A: delta=[+5,+5,+5,-1,-1,+6,+6,+6], tolerance=3
     *
     * Walk-through:
     *   i=0: +5 → gain=5,  desc=0, peakEnd=1
     *   i=1: +5 → gain=10, desc=0, peakEnd=2
     *   i=2: +5 → gain=15, desc=0, peakEnd=3
     *   i=3: -1 → desc=1 ≤ 3, gain=14                       (absorbed)
     *   i=4: -1 → desc=2 ≤ 3, gain=13                       (absorbed, desc NOT reset)
     *   i=5: +6 → gain=19, desc=0, peakEnd=6               (desc RESET by ascent)
     *   i=6: +6 → gain=25, desc=0, peakEnd=7
     *   i=7: +6 → gain=31, desc=0, peakEnd=8
     *   post-loop: finalise(0, 8, 31)
     *
     * Expected: bestGain=31, bestStart=0, bestEnd=8, allCandidates=1 (no mid-loop restart)
     */
    @Test
    @DisplayName("[Hand-A] delta=[+5,+5,+5,-1,-1,+6,+6,+6] tol=3 → ONE climb, gain=31")
    void handVerification_caseA_absorbs_smallDips() {
        double[] deltas = {+5, +5, +5, -1, -1, +6, +6, +6};
        List<RoutePoint> pts = pointsFromDeltas(deltas);
        double[] cumDist = uniformCumDist(pts.size(), 100.0);

        ToleranceKadaneEngine.Result result = engine.findMaxClimb(
                pts, cumDist, TOLERANCE, MIN_GAIN, MIN_GRADE, MIN_STEP);

        ClimbSegment seg = result.getBestSegment();
        assertNotNull(seg, "Expected a best segment (the whole array is one climb)");

        // ── Print real numbers as requested ──────────────────────────────────
        System.out.printf(
                "[Hand-A] bestGain=%.4f  bestStart=%d  bestEnd=%d  alternates=%d%n",
                seg.getGain(), seg.getStartIndex(), seg.getEndIndex(),
                result.getAlternateMaxima().size());

        // ── Assert expected values ────────────────────────────────────────────
        // Both -1 dips were absorbed (cumDesc stayed at 1 then 2, never >3).
        // The +6 at i=5 reset descentSinceLastPeak to 0 and continued the window.
        // Net result: one window from 0→8 with gain = sum of deltas = 5+5+5-1-1+6+6+6 = 31.
        assertEquals(31.0, seg.getGain(), 0.01,
                "Gain must be 31m — both -1 dips were absorbed into the climb");
        assertEquals(0, seg.getStartIndex(), "Start must be 0 (no restart occurred)");
        assertEquals(8, seg.getEndIndex(),   "End must be 8 (the whole array)");
        assertTrue(result.getAlternateMaxima().isEmpty(),
                "No alternates: only one candidate was produced");
        assertTrue(result.isSignificant(), "31m at ~3.9% grade exceeds both thresholds");
    }

    /**
     * CASE B: delta=[+5,+5,+5,-2,-2,+6,+6,+6], tolerance=3
     *
     * Walk-through:
     *   i=0: +5 → gain=5,  desc=0, peakEnd=1
     *   i=1: +5 → gain=10, desc=0, peakEnd=2
     *   i=2: +5 → gain=15, desc=0, peakEnd=3
     *   i=3: -2 → desc=2 ≤ 3, gain=13                       (absorbed)
     *   i=4: -2 → desc=4 > 3 → RESTART
     *                finalise candidate(start=0, end=3, gain=13)
     *                → allCandidates=[(0,3,13)], bestGain=13
     *                restart: start=5, gain=0, desc=0, peakEnd=5
     *   i=5: +6 → gain=6,  desc=0, peakEnd=6
     *   i=6: +6 → gain=12, desc=0, peakEnd=7
     *   i=7: +6 → gain=18, desc=0, peakEnd=8
     *   post-loop: finalise(5, 8, 18)
     *              18 > 13+1e-6 → bestGain=18, bestStart=5, bestEnd=8
     *              allCandidates=[(0,3,13), (5,8,18)]
     *
     * Expected: bestGain=18, bestStart=5, bestEnd=8, 2 total candidates
     */
    @Test
    @DisplayName("[Hand-B] delta=[+5,+5,+5,-2,-2,+6,+6,+6] tol=3 → TWO climbs, best=18 starting at 5")
    void handVerification_caseB_splitsByTolerance() {
        double[] deltas = {+5, +5, +5, -2, -2, +6, +6, +6};
        List<RoutePoint> pts = pointsFromDeltas(deltas);
        double[] cumDist = uniformCumDist(pts.size(), 100.0);

        ToleranceKadaneEngine.Result result = engine.findMaxClimb(
                pts, cumDist, TOLERANCE, MIN_GAIN, MIN_GRADE, MIN_STEP);

        ClimbSegment seg = result.getBestSegment();
        assertNotNull(seg, "Expected a best segment (Climb 2 is the winner)");

        // ── Print real numbers as requested ──────────────────────────────────
        System.out.printf(
                "[Hand-B] bestGain=%.4f  bestStart=%d  bestEnd=%d  alternates=%d%n",
                seg.getGain(), seg.getStartIndex(), seg.getEndIndex(),
                result.getAlternateMaxima().size());

        // ── Assert expected values ────────────────────────────────────────────
        // The cumulative dip at i=4 pushed descentSinceLastPeak to 4 > 3.
        // The engine restarted after i=4. Climb 1 was finalised with gain=13
        // (includes the absorbed -2 at i=3, which had already been subtracted
        // from currentGain before the restart check at i=4).
        // Climb 2 is [5..8] with gain = 6+6+6 = 18.
        assertEquals(18.0, seg.getGain(), 0.01,
                "Best gain must be 18m (Climb 2: three +6 steps)");
        assertEquals(5, seg.getStartIndex(),
                "Best must START at index 5, not 0 — proves restart occurred");
        assertEquals(8, seg.getEndIndex(),
                "Best must END at index 8");
        // The alternate-maxima list is empty because 13 ≠ 18; no tie.
        assertTrue(result.getAlternateMaxima().isEmpty(),
                "No tie: 18 ≠ 13, so alternates must be empty");
        assertTrue(result.isSignificant(), "18m exceeds minimum thresholds");
    }


    // ── ════════════════════════════════════════════════════════════════════ ──
    // FULL PHASE 3 TEST SUITE
    // ── ════════════════════════════════════════════════════════════════════ ──

    // ── Case C: Single unbroken climb ────────────────────────────────────────

    @Test
    @DisplayName("[C] Single unbroken climb: no dips, gain = sum of all deltas")
    void singleUnbrokenClimb() {
        double[] deltas = {+3, +4, +5, +6, +7};  // gain = 25m
        List<RoutePoint> pts = pointsFromDeltas(deltas);
        double[] cumDist = uniformCumDist(pts.size(), 100.0);

        ToleranceKadaneEngine.Result result = engine.findMaxClimb(
                pts, cumDist, TOLERANCE, MIN_GAIN, MIN_GRADE, MIN_STEP);

        ClimbSegment seg = result.getBestSegment();
        assertNotNull(seg);
        assertEquals(25.0, seg.getGain(), 0.01, "Gain must be sum of all ascending deltas");
        assertEquals(0, seg.getStartIndex(), "Must start at 0");
        assertEquals(5, seg.getEndIndex(),   "Must end at last point");
        assertTrue(result.isSignificant());
        assertTrue(result.getAlternateMaxima().isEmpty());
    }

    // ── Case D: All flat ─────────────────────────────────────────────────────

    @Test
    @DisplayName("[D] All-flat route → no significant climb (hasSignificantClimb=false)")
    void allFlat_noSignificantClimb() {
        double[] deltas = {0, 0, 0, 0, 0};
        List<RoutePoint> pts = pointsFromDeltas(deltas);
        double[] cumDist = uniformCumDist(pts.size(), 100.0);

        ToleranceKadaneEngine.Result result = engine.findMaxClimb(
                pts, cumDist, TOLERANCE, MIN_GAIN, MIN_GRADE, MIN_STEP);

        assertNull(result.getBestSegment(), "Flat route must return null best segment");
        assertFalse(result.isSignificant(),
                "isSignificant must be false for a flat route");
        assertTrue(result.getAlternateMaxima().isEmpty());
    }

    // ── Case E: All descending ───────────────────────────────────────────────

    @Test
    @DisplayName("[E] All-descending route → no significant climb")
    void allDescending_noSignificantClimb() {
        double[] deltas = {-5, -5, -5, -10, -10};
        List<RoutePoint> pts = pointsFromDeltas(deltas);
        double[] cumDist = uniformCumDist(pts.size(), 100.0);

        ToleranceKadaneEngine.Result result = engine.findMaxClimb(
                pts, cumDist, TOLERANCE, MIN_GAIN, MIN_GRADE, MIN_STEP);

        assertNull(result.getBestSegment(),
                "All-descending route must return null best segment");
        assertFalse(result.isSignificant());
    }

    // ── Case F: Tie — two equal-gain segments ────────────────────────────────

    @Test
    @DisplayName("[F] Two equal-gain segments → alternateMaxima populated with the other")
    void twoEqualGainSegments_populatesAlternates() {
        // Segment 1: [0..3] gain = 5+5+5 = 15m
        // Separator:  gap > tolerance (here: -10 triggers restart)
        // Segment 2: [4..7] gain = 5+5+5 = 15m (exact tie)
        double[] deltas = {+5, +5, +5, -10, +5, +5, +5};
        List<RoutePoint> pts = pointsFromDeltas(deltas);
        double[] cumDist = uniformCumDist(pts.size(), 100.0);

        ToleranceKadaneEngine.Result result = engine.findMaxClimb(
                pts, cumDist, TOLERANCE, MIN_GAIN, MIN_GRADE, MIN_STEP);

        ClimbSegment best = result.getBestSegment();
        assertNotNull(best, "Expected a best segment");

        System.out.printf(
                "[F] bestGain=%.2f  bestStart=%d  bestEnd=%d  alternates=%d%n",
                best.getGain(), best.getStartIndex(), best.getEndIndex(),
                result.getAlternateMaxima().size());

        assertEquals(15.0, best.getGain(), 0.01, "Both segments gain 15m");
        assertEquals(1, result.getAlternateMaxima().size(),
                "Exactly one alternate maximum (the other 15m segment)");

        ClimbSegment alt = result.getAlternateMaxima().get(0);
        assertEquals(15.0, alt.getGain(), 0.01, "Alternate must also be 15m");
        // The two segments must be distinct (different start/end)
        assertFalse(best.getStartIndex() == alt.getStartIndex()
                        && best.getEndIndex() == alt.getEndIndex(),
                "Best and alternate must be different segments");
    }

    // ── Case G: Empty points list ────────────────────────────────────────────

    @Test
    @DisplayName("[G] Empty points list → null result, no crash")
    void emptyPoints_returnsNullSegment() {
        List<RoutePoint> pts = List.of();
        double[] cumDist = new double[0];

        ToleranceKadaneEngine.Result result = engine.findMaxClimb(
                pts, cumDist, TOLERANCE, MIN_GAIN, MIN_GRADE, MIN_STEP);

        assertNull(result.getBestSegment(), "Empty input must return null segment");
        assertFalse(result.isSignificant());
        assertTrue(result.getAlternateMaxima().isEmpty());
    }

    // ── Case H: Single point (n < 2) ────────────────────────────────────────

    @Test
    @DisplayName("[H] Single point (n<2) → null result, no crash")
    void singlePoint_returnsNullSegment() {
        List<RoutePoint> pts = pointsFromDeltas(new double[0]);  // 1 point
        double[] cumDist = new double[]{0.0};

        ToleranceKadaneEngine.Result result = engine.findMaxClimb(
                pts, cumDist, TOLERANCE, MIN_GAIN, MIN_GRADE, MIN_STEP);

        assertNull(result.getBestSegment(), "Single point must return null segment");
        assertFalse(result.isSignificant());
    }

    // ── Case I: Short-but-steep climb ────────────────────────────────────────

    /**
     * A length-only heuristic would reject a climb that is very brief.
     * Our algorithm uses BOTH gain and grade thresholds, so a short steep
     * climb is correctly accepted when both thresholds are met.
     *
     * Setup: 2 points, 50m apart horizontally, 30m elevation gain.
     *   Grade = 30/50 × 100 = 60% — extremely steep, clearly above minGrade=0.5%
     *   Gain  = 30m — above minGain=5m
     * Expected: isSignificant=true (both thresholds cleared despite being short)
     */
    @Test
    @DisplayName("[I] Short but steep climb → significant=true (gain AND grade both clear thresholds)")
    void shortSteepClimb_isSignificant() {
        // Two points: 50m apart, 30m elevation gain → 60% grade
        RoutePoint p0 = new RoutePoint(47.0, 8.0, 500.0, null);
        p0.setSmoothedElevation(500.0);
        p0.setDistanceFromStart(0.0);
        RoutePoint p1 = new RoutePoint(47.001, 8.0, 530.0, null);
        p1.setSmoothedElevation(530.0);
        p1.setDistanceFromStart(50.0);

        List<RoutePoint> pts = List.of(p0, p1);
        double[] cumDist = {0.0, 50.0};

        ToleranceKadaneEngine.Result result = engine.findMaxClimb(
                pts, cumDist, TOLERANCE, MIN_GAIN, MIN_GRADE, MIN_STEP);

        ClimbSegment seg = result.getBestSegment();
        assertNotNull(seg, "A steep 30m climb over 50m must be detected");

        System.out.printf(
                "[I] shortSteep: gain=%.2fm  grade=%.2f%%  significant=%b%n",
                seg.getGain(), seg.getAvgGrade(), result.isSignificant());

        assertEquals(30.0, seg.getGain(), 0.01, "Gain must be exactly 30m");
        assertTrue(seg.getAvgGrade() > 50.0, "Grade must be ~60% (very steep)");
        assertTrue(result.isSignificant(),
                "Short steep climb must be significant — length-only heuristic would WRONGLY reject this");
    }

    // ── Case J: Recovery detection (negate=true) ─────────────────────────────

    /**
     * Run findMaxRecovery on a mirror of Case B:
     *   deltas = [-5,-5,-5,+2,+2,-6,-6,-6] (negated from Case B's climb array)
     *
     * With negate=true, the engine negates these again → effective deltas for
     * the scan are [+5,+5,+5,-2,-2,+6,+6,+6] — identical to Case B.
     * So the recovery result should mirror Case B:
     *   bestGain=18, bestStart=5, bestEnd=8
     *
     * This confirms the negate=true path is not accidentally reusing stale
     * climb state — it's a fresh independent scan.
     */
    @Test
    @DisplayName("[J] Recovery detection: findMaxRecovery on a descent mirrors Case B result")
    void recoveryDetection_negatePath_isolatedFromClimbResult() {
        // A pure-descent route that mirrors Case B in the negative direction.
        // deltas for the descent: [-5,-5,-5,+2,+2,-6,-6,-6]
        // With negate=true, the engine will scan [+5,+5,+5,-2,-2,+6,+6,+6]
        // → same split logic as Case B.
        double[] deltas = {-5, -5, -5, +2, +2, -6, -6, -6};
        List<RoutePoint> pts = pointsFromDeltas(deltas);
        double[] cumDist = uniformCumDist(pts.size(), 100.0);

        ToleranceKadaneEngine.Result climbResult = engine.findMaxClimb(
                pts, cumDist, TOLERANCE, MIN_GAIN, MIN_GRADE, MIN_STEP);

        ToleranceKadaneEngine.Result recoveryResult = engine.findMaxRecovery(
                pts, cumDist, TOLERANCE, MIN_GAIN, MIN_GRADE, MIN_STEP);

        System.out.printf(
                "[J] Climb on descent route: bestGain=%.2f (should be null or near 0)%n",
                climbResult.getBestSegment() == null ? 0.0
                        : climbResult.getBestSegment().getGain());
        System.out.printf(
                "[J] Recovery (descent): bestGain=%.2f  bestStart=%d  bestEnd=%d%n",
                recoveryResult.getBestSegment() == null ? 0.0
                        : recoveryResult.getBestSegment().getGain(),
                recoveryResult.getBestSegment() == null ? -1
                        : recoveryResult.getBestSegment().getStartIndex(),
                recoveryResult.getBestSegment() == null ? -1
                        : recoveryResult.getBestSegment().getEndIndex());

        // Climb on a descent-dominant route — the small +2,+2 bumps may register
        // as a tiny climb, but it must NOT equal the recovery gain.
        ClimbSegment recovery = recoveryResult.getBestSegment();
        assertNotNull(recovery, "Recovery path must detect the major descent segment");
        assertEquals(18.0, recovery.getGain(), 0.01,
                "Recovery gain must be 18m (mirrors Case B Climb 2 gain)");
        assertEquals(5, recovery.getStartIndex(),
                "Recovery must start at 5 (same split as Case B, via negate=true)");
        assertEquals(8, recovery.getEndIndex(),
                "Recovery must end at 8");

        // Confirm the climb result on this descent route is NOT accidentally 18m
        // (proving there's no shared state between the two calls).
        if (climbResult.getBestSegment() != null) {
            assertNotEquals(18.0, climbResult.getBestSegment().getGain(), 0.01,
                    "Climb result on a descent route must NOT match the recovery gain");
        }
    }

    // ── Regression Tests: Invariant I5 & Total Ascent ────────────────────────

    /**
     * Regression Test (a): Leading dip + climb.
     * delta = [-2.0, +5.0, +5.0, +5.0], tolerance = 3.0
     *
     * Without Invariant I5, the -2.0 dip would be absorbed because 2.0 <= 3.0 tolerance,
     * retaining startIndex=0 and yielding net gain = -2 + 5 + 5 + 5 = 13.0m.
     * With Invariant I5 (Kadane negative-sum reset), currentGain becomes -2.0 < 0 at i=0,
     * immediately resetting currentStart = 1 and currentGain = 0.
     * The climb starting at index 1 is detected cleanly with:
     *   startIndex = 1, endIndex = 4, gain = 15.0m, totalAscentM = 15.0m.
     */
    @Test
    @DisplayName("[Regression-A] Leading dip + climb → resets startIndex to skip negative prefix")
    void regression_leadingDip_resetsStartIndex() {
        double[] deltas = {-2.0, +5.0, +5.0, +5.0};
        List<RoutePoint> pts = pointsFromDeltas(deltas);
        double[] cumDist = uniformCumDist(pts.size(), 100.0);

        ToleranceKadaneEngine.Result result = engine.findMaxClimb(
                pts, cumDist, TOLERANCE, MIN_GAIN, MIN_GRADE, MIN_STEP);

        ClimbSegment seg = result.getBestSegment();
        assertNotNull(seg);

        System.out.printf(
                "[Regression-A] gain=%.2f  totalAscent=%.2f  start=%d  end=%d%n",
                seg.getGain(), seg.getTotalAscentM(), seg.getStartIndex(), seg.getEndIndex());

        assertEquals(1, seg.getStartIndex(),
                "Must start at index 1 — Kadane reset must discard the leading -2.0m dip");
        assertEquals(4, seg.getEndIndex(), "Must end at index 4");
        assertEquals(15.0, seg.getGain(), 0.01,
                "Net gain must be 15m (5+5+5), not 13m (-2+5+5+5)");
        assertEquals(15.0, seg.getTotalAscentM(), 0.01,
                "Total ascent must be 15m");
    }

    /**
     * Regression Test (b): Mid-climb dip within tolerance.
     * delta = [+5.0, +5.0, -2.0, +5.0, +5.0], tolerance = 3.0
     *
     * The -2.0m dip occurs when currentGain is +10.0m.
     * After the dip, currentGain = 8.0m > 0 and descentSinceLastPeak = 2.0m <= 3.0m.
     * Since currentGain never drops below 0 and dip <= tolerance, the dip is absorbed.
     * Result:
     *   startIndex = 0, endIndex = 5
     *   gain (net gain) = 5 + 5 - 2 + 5 + 5 = 18.0m (telescoping preserved)
     *   totalAscentM = 5 + 5 + 5 + 5 = 20.0m (sum of positive deltas)
     */
    @Test
    @DisplayName("[Regression-B] Mid-climb dip within tolerance → absorbed into climb, preserves totalAscent vs gain")
    void regression_midClimbDip_absorbsWithinTolerance() {
        double[] deltas = {+5.0, +5.0, -2.0, +5.0, +5.0};
        List<RoutePoint> pts = pointsFromDeltas(deltas);
        double[] cumDist = uniformCumDist(pts.size(), 100.0);

        ToleranceKadaneEngine.Result result = engine.findMaxClimb(
                pts, cumDist, TOLERANCE, MIN_GAIN, MIN_GRADE, MIN_STEP);

        ClimbSegment seg = result.getBestSegment();
        assertNotNull(seg);

        System.out.printf(
                "[Regression-B] gain=%.2f  totalAscent=%.2f  start=%d  end=%d%n",
                seg.getGain(), seg.getTotalAscentM(), seg.getStartIndex(), seg.getEndIndex());

        assertEquals(0, seg.getStartIndex(),
                "Must start at index 0 — mid-climb dip is absorbed");
        assertEquals(5, seg.getEndIndex(), "Must end at index 5");
        assertEquals(18.0, seg.getGain(), 0.01,
                "Net gain must be 18m (5+5-2+5+5)");
        assertEquals(20.0, seg.getTotalAscentM(), 0.01,
                "Total cumulative ascent must be 20m (5+5+5+5, ignoring the 2m dip)");
    }



    // ── ════════════════════════════════════════════════════════════════════ ──
    // SEGMENT CLASSIFIER TESTS
    // ── ════════════════════════════════════════════════════════════════════ ──

    // Helper: build points with explicit smoothed elevations and uniform spacing
    private List<RoutePoint> classifierPoints(double... elevations) {
        List<RoutePoint> pts = new ArrayList<>();
        for (int i = 0; i < elevations.length; i++) {
            RoutePoint p = new RoutePoint(47.0 + i * 0.001, 8.0, elevations[i], null);
            p.setSmoothedElevation(elevations[i]);
            p.setDistanceFromStart(i * 1000.0); // 1km per step
            pts.add(p);
        }
        return pts;
    }

    private double[] classifierCumDist(int n) {
        double[] d = new double[n];
        for (int i = 0; i < n; i++) d[i] = i * 1000.0;
        return d;
    }

    // ── Case K: Pure climbing ────────────────────────────────────────────────

    @Test
    @DisplayName("[K] All climbing steps → single CLIMBING zone spanning entire route")
    void allClimbing_singleClimbingZone() {
        // Each step is +10m over 1000m = +1.0% grade, above the +0.5% dead-band
        List<RoutePoint> pts = classifierPoints(500, 510, 520, 530, 540);
        double[] cumDist = classifierCumDist(5);

        List<RouteZone> zones = classifier.classify(pts, cumDist, 0.1);

        assertEquals(1, zones.size(), "All-climbing route must produce exactly 1 zone");
        assertEquals(ZoneType.CLIMBING, zones.get(0).getType(), "Zone must be CLIMBING");
        assertEquals(0, zones.get(0).getStartIndex());
        assertEquals(4, zones.get(0).getEndIndex());
    }

    // ── Case L: Pure descending ──────────────────────────────────────────────

    @Test
    @DisplayName("[L] All descending steps → single DESCENDING zone spanning entire route")
    void allDescending_singleDescendingZone() {
        // Each step is -10m over 1000m = -1.0% grade, below the -0.5% dead-band
        List<RoutePoint> pts = classifierPoints(540, 530, 520, 510, 500);
        double[] cumDist = classifierCumDist(5);

        List<RouteZone> zones = classifier.classify(pts, cumDist, 0.1);

        assertEquals(1, zones.size(), "All-descending route must produce exactly 1 zone");
        assertEquals(ZoneType.DESCENDING, zones.get(0).getType(), "Zone must be DESCENDING");
    }

    // ── Case M: Mixed terrain ────────────────────────────────────────────────

    @Test
    @DisplayName("[M] Climb then flat then descend → three distinct zones in order")
    void mixedTerrain_threeZones() {
        // 500→510 (+1.0% CLIMBING)
        // 510→510 (0.0% FLAT)
        // 510→500 (-1.0% DESCENDING)
        List<RoutePoint> pts = classifierPoints(500, 510, 510, 500);
        double[] cumDist = classifierCumDist(4);

        List<RouteZone> zones = classifier.classify(pts, cumDist, 0.1);

        assertEquals(3, zones.size(), "Expected 3 zones: CLIMBING, FLAT, DESCENDING");
        assertEquals(ZoneType.CLIMBING,   zones.get(0).getType());
        assertEquals(ZoneType.FLAT,       zones.get(1).getType());
        assertEquals(ZoneType.DESCENDING, zones.get(2).getType());
    }

    // ── Case N: Dead-band — below climbing threshold ──────────────────────────

    @Test
    @DisplayName("[N] Grade = +0.4% (inside dead-band) → classified as FLAT, not CLIMBING")
    void deadBand_nearPositive_isFlat() {
        // +4m over 1000m = 0.4% grade — inside the ±0.5% dead-band
        List<RoutePoint> pts = classifierPoints(500, 504, 508);
        double[] cumDist = classifierCumDist(3);

        List<RouteZone> zones = classifier.classify(pts, cumDist, 0.1);

        assertEquals(1, zones.size());
        assertEquals(ZoneType.FLAT, zones.get(0).getType(),
                "0.4% grade is within the ±0.5% dead-band and must be FLAT");
    }

    // ── Case O: Dead-band — below descending threshold ────────────────────────

    @Test
    @DisplayName("[O] Grade = -0.4% (inside dead-band) → classified as FLAT, not DESCENDING")
    void deadBand_nearNegative_isFlat() {
        // -4m over 1000m = -0.4% grade — inside the ±0.5% dead-band
        List<RoutePoint> pts = classifierPoints(508, 504, 500);
        double[] cumDist = classifierCumDist(3);

        List<RouteZone> zones = classifier.classify(pts, cumDist, 0.1);

        assertEquals(1, zones.size());
        assertEquals(ZoneType.FLAT, zones.get(0).getType(),
                "-0.4% grade is within the ±0.5% dead-band and must be FLAT");
    }

    // ── Case P: Fewer than 2 points ──────────────────────────────────────────

    @Test
    @DisplayName("[P] Fewer than 2 points → empty zone list, no crash")
    void fewerThanTwoPoints_emptyZones() {
        List<RoutePoint> pts = classifierPoints(500.0);  // single point
        double[] cumDist = {0.0};

        List<RouteZone> zones = classifier.classify(pts, cumDist, 0.1);

        assertTrue(zones.isEmpty(), "Single-point input must produce no zones");
    }

    // ── Case Q: Steps too short for meaningful grade ──────────────────────────

    @Test
    @DisplayName("[Q] Steps shorter than minStepDistance → classified as FLAT (carry-forward)")
    void tooShortSteps_carriedForwardAsFlat() {
        // Points are only 0.01m apart (< minStepDistance=1.0m)
        // currentType starts null → first step defaults to FLAT
        RoutePoint p0 = new RoutePoint(47.0, 8.0, 500.0, null);
        p0.setSmoothedElevation(500.0);
        p0.setDistanceFromStart(0.0);
        RoutePoint p1 = new RoutePoint(47.0, 8.0, 510.0, null);
        p1.setSmoothedElevation(510.0);
        p1.setDistanceFromStart(0.005); // 5mm apart — far below minStepDistance=1.0m
        RoutePoint p2 = new RoutePoint(47.0, 8.0, 520.0, null);
        p2.setSmoothedElevation(520.0);
        p2.setDistanceFromStart(0.010);

        List<RoutePoint> pts = List.of(p0, p1, p2);
        double[] cumDist = {0.0, 0.005, 0.010};

        // minStepDistance = 1.0m — all steps are below this, so grade is indeterminate
        List<RouteZone> zones = classifier.classify(pts, cumDist, 1.0);

        assertFalse(zones.isEmpty(), "Should still produce at least one zone");
        // All steps are too short → all carry forward as FLAT (currentType=null → FLAT)
        zones.forEach(z -> assertEquals(ZoneType.FLAT, z.getType(),
                "Indeterminate-grade steps must default to FLAT"));
    }

    // ── Case R: Disjoint recovery candidate exclusion ─────────────────────────

    @Test
    @DisplayName("[R] findMaxRecovery with exclude range guarantees recovery is strictly disjoint from climb")
    void findMaxRecovery_withExcludeRange_guaranteesDisjointSegments() {
        // Setup: Climb 1 (drop), flat valley, Climb 2, descent
        // Points:
        // 0..3: climb (+10, +10, +10) -> ends at index 3 (elev 530)
        // 3..6: descent (-15, -15, -15) -> from index 3 to 6 (elev drops from 530 to 485) = 45m drop
        // 6..9: massive climb (+20, +20, +20) -> from index 6 to 9 (elev rises from 485 to 545) = 60m gain
        // 9..12: minor descent (-5, -5, -5) -> from index 9 to 12 = 15m drop
        double[] deltas = {+10, +10, +10, -15, -15, -15, +20, +20, +20, -5, -5, -5};
        List<RoutePoint> pts = pointsFromDeltas(deltas);
        double[] cumDist = uniformCumDist(pts.size(), 100.0);

        // Find max climb: should find [6..9] with 60m gain
        ToleranceKadaneEngine.Result climbResult = engine.findMaxClimb(
                pts, cumDist, TOLERANCE, MIN_GAIN, MIN_GRADE, MIN_STEP);
        assertNotNull(climbResult.getBestSegment());
        assertEquals(6, climbResult.getBestSegment().getStartIndex());
        assertEquals(9, climbResult.getBestSegment().getEndIndex());
        assertEquals(60.0, climbResult.getBestSegment().getGain(), 0.01);

        // Run recovery with max climb excluded [6..9]
        ToleranceKadaneEngine.Result recoveryResult = engine.findMaxRecovery(
                pts, cumDist, TOLERANCE, MIN_GAIN, MIN_GRADE, MIN_STEP, 6, 9);
        assertNotNull(recoveryResult.getBestSegment());
        ClimbSegment rec = recoveryResult.getBestSegment();

        // Must find the 45m descent at [3..6]
        assertEquals(3, rec.getStartIndex());
        assertEquals(6, rec.getEndIndex());
        assertEquals(45.0, rec.getGain(), 0.01);

        // Verify strictly disjoint: rec.endIndex <= 6 (touches at boundary, 0 overlap)
        assertTrue(rec.getEndIndex() <= 6 || rec.getStartIndex() >= 9,
                "Recovery segment must be strictly disjoint from excluded climb [6..9]");
    }

    // ── Case S: Climb in middle, larger recovery AFTER the climb ──────────────

    @Test
    @DisplayName("[S] findMaxRecovery correctly searches both sides and picks larger recovery AFTER middle climb")
    void findMaxRecovery_climbInMiddle_picksLargerRecoveryAfterClimb() {
        // Setup:
        // 0..3: minor descent (-5, -5, -5) -> 15m drop (pts 0 to 3)
        // 3..6: middle climb (+20, +20, +20) -> 60m gain (pts 3 to 6)
        // 6..9: major descent (-15, -15, -15) -> 45m drop (pts 6 to 9)
        double[] deltas = {-5, -5, -5, +20, +20, +20, -15, -15, -15};
        List<RoutePoint> pts = pointsFromDeltas(deltas);
        double[] cumDist = uniformCumDist(pts.size(), 100.0);

        // Max climb is [3..6] (60m gain)
        ToleranceKadaneEngine.Result climbResult = engine.findMaxClimb(
                pts, cumDist, TOLERANCE, MIN_GAIN, MIN_GRADE, MIN_STEP);
        assertNotNull(climbResult.getBestSegment());
        assertEquals(3, climbResult.getBestSegment().getStartIndex());
        assertEquals(6, climbResult.getBestSegment().getEndIndex());
        assertEquals(60.0, climbResult.getBestSegment().getGain(), 0.01);

        // Run recovery excluding middle climb [3..6]
        // Candidate before: [0..3] with 15m drop
        // Candidate after:  [6..9] with 45m drop
        // Must evaluate both sides and select [6..9] (45m drop)
        ToleranceKadaneEngine.Result recoveryResult = engine.findMaxRecovery(
                pts, cumDist, TOLERANCE, MIN_GAIN, MIN_GRADE, MIN_STEP, 3, 6);

        assertNotNull(recoveryResult.getBestSegment());
        ClimbSegment rec = recoveryResult.getBestSegment();
        assertEquals(6, rec.getStartIndex(), "Must pick recovery candidate starting at/after climb end");
        assertEquals(9, rec.getEndIndex(), "Must pick recovery candidate after middle climb");
        assertEquals(45.0, rec.getGain(), 0.01, "Must pick the global maximum recovery (45m > 15m)");
        assertTrue(recoveryResult.isSignificant());
    }

    // ── Case T: Route is 100% pure climb, entire route excluded ───────────────

    @Test
    @DisplayName("[T] findMaxRecovery returns null and isSignificant=false when entire route is a climb")
    void findMaxRecovery_entireRouteIsClimb_returnsNoSignificantRecovery() {
        // Pure ascending steps, no descent anywhere
        double[] deltas = {+10, +10, +10, +10, +10};
        List<RoutePoint> pts = pointsFromDeltas(deltas);
        double[] cumDist = uniformCumDist(pts.size(), 100.0);

        // Climb spans [0..5] (50m gain)
        ToleranceKadaneEngine.Result climbResult = engine.findMaxClimb(
                pts, cumDist, TOLERANCE, MIN_GAIN, MIN_GRADE, MIN_STEP);
        assertNotNull(climbResult.getBestSegment());
        assertEquals(0, climbResult.getBestSegment().getStartIndex());
        assertEquals(5, climbResult.getBestSegment().getEndIndex());

        // Excluding the climb [0..5] leaves nothing for recovery
        ToleranceKadaneEngine.Result recoveryResult = engine.findMaxRecovery(
                pts, cumDist, TOLERANCE, MIN_GAIN, MIN_GRADE, MIN_STEP, 0, 5);

        assertNull(recoveryResult.getBestSegment(), "Best recovery segment must be null");
        assertFalse(recoveryResult.isSignificant(), "isSignificant must be false");
        assertTrue(recoveryResult.getAlternateMaxima().isEmpty());
    }

    // ── Case U: Equal recovery candidates on both sides of middle climb (tie) ─

    @Test
    @DisplayName("[U] findMaxRecovery detects ties across disjoint boundaries on either side of middle climb")
    void findMaxRecovery_equalRecoveryBothSides_detectsAlternateMaxima() {
        // Setup:
        // 0..3: descent (-15, -15, -15) -> 45m drop
        // 3..6: climb (+25, +25, +25) -> 75m gain
        // 6..9: descent (-15, -15, -15) -> 45m drop (identical magnitude)
        double[] deltas = {-15, -15, -15, +25, +25, +25, -15, -15, -15};
        List<RoutePoint> pts = pointsFromDeltas(deltas);
        double[] cumDist = uniformCumDist(pts.size(), 100.0);

        ToleranceKadaneEngine.Result recoveryResult = engine.findMaxRecovery(
                pts, cumDist, TOLERANCE, MIN_GAIN, MIN_GRADE, MIN_STEP, 3, 6);

        assertNotNull(recoveryResult.getBestSegment());
        assertEquals(45.0, recoveryResult.getBestSegment().getGain(), 0.01);
        assertEquals(1, recoveryResult.getAlternateMaxima().size(),
                "Must detect the other 45m recovery as an alternate maximum across the climb boundary");
    }
}
