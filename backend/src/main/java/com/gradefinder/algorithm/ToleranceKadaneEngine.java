package com.gradefinder.algorithm;

import com.gradefinder.model.ClimbSegment;
import com.gradefinder.model.RoutePoint;

import java.util.ArrayList;
import java.util.List;

/**
 * The core climb-detection algorithm: Kadane's Maximum Subarray with
 * Bounded Descent Tolerance.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * PHASE 0: ALGORITHM DOCUMENTATION
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ── WHY ELEVATION DIFFERENCES TELESCOPE ─────────────────────────────────────
 *
 * Given a smoothed elevation sequence  E[0], E[1], …, E[n-1],
 * define the delta (step-gain) array:
 *
 *     delta[i] = E[i+1] − E[i],    for i = 0 … n-2
 *
 * The sum of a contiguous subarray of deltas telescopes:
 *
 *     sum(delta[i..j]) = delta[i] + delta[i+1] + … + delta[j]
 *                      = (E[i+1]−E[i]) + (E[i+2]−E[i+1]) + … + (E[j+1]−E[j])
 *                      = E[j+1] − E[i]          ← ALL intermediate terms cancel
 *
 * Therefore, maximising sum(delta[i..j]) is mathematically identical to
 * maximising E[j+1] − E[i], the net elevation gain from point i to point j+1.
 *
 * This telescoping property is what makes Kadane's algorithm valid for
 * elevation analysis: it implicitly finds the pair (startIndex, endIndex)
 * that yields the maximum net gain in a single O(n) left-to-right scan,
 * without ever explicitly comparing all O(n²) pairs.
 *
 *
 * ── WHY PLAIN KADANE'S IS WRONG FOR CLIMB DETECTION ───────────────────────
 *
 * Plain Kadane's maximises the subarray sum, which (by telescoping) picks the
 * pair (i, j) with maximum E[j] − E[i].  This is provably correct for the
 * abstract question "what is the maximum elevation difference over any
 * contiguous window?"  But that question is NOT what "hardest sustained climb"
 * means in practice.
 *
 * The failure mode: flat terrain contributes delta ≈ 0.  Because 0 never
 * causes the running sum to decrease, plain Kadane's is free to extend a
 * window across arbitrarily many kilometres of flat valley without penalty.
 * The result: a window that spans two completely separate climbs bridged by
 * flat terrain is selected because the flat portion costs nothing.
 *
 * Concrete counter-example:
 *
 *   Elevation:  500 → [climb 1: +100m] → 600 → [flat: 5 km] → 600 → [climb 2: +120m] → 720
 *   Plain Kadane selects:  E[j]−E[i] = 720−500 = 220m  (the entire route!)
 *   Correct answer:        Climb 2 = 120m (the bigger SUSTAINED effort)
 *
 * This is not a corner case — it is the dominant failure mode on any route
 * with multiple hills separated by flat stretches.
 *
 *
 * ── THE BOUNDED-DESCENT-TOLERANCE FIX ───────────────────────────────────────
 *
 * We augment the Kadane loop with a descent accumulator:
 *
 *     descentSinceLastPeak   — cumulative elevation loss since the last
 *                              local high point within the current candidate
 *
 * At each step:
 *
 *   if delta[i] >= 0:
 *       currentGain += delta[i]
 *       descentSinceLastPeak = 0     ← reset: we're climbing again
 *       currentPeakEnd = i + 1       ← update the high-water mark
 *
 *   else:  // delta[i] < 0, i.e. a dip
 *       descentSinceLastPeak += |delta[i]|
 *
 *       if descentSinceLastPeak > descentTolerance:
 *           // The dip is too large — the climb is genuinely broken.
 *           // Finalise the current candidate at its peak, then RESTART.
 *           finalise(currentStart, currentPeakEnd, currentGain)
 *           reset(currentStart = i+1, currentGain = 0, descentSinceLastPeak = 0)
 *
 *       else:
 *           // Small roller (within tolerance) — absorb it.
 *           currentGain += delta[i]   // delta[i] is negative, so this subtracts
 *
 * Key invariants maintained by this loop:
 *   I1. descentSinceLastPeak resets to 0 whenever we climb (delta >= 0).
 *   I2. descentSinceLastPeak accumulates ONLY consecutive-dip meters, not total loss.
 *   I3. When a restart occurs, bestStart/bestEnd are updated if the finalised
 *       candidate beats the current best (by more than FLOAT_TOLERANCE, to handle
 *       IEEE 754 rounding near equality).
 *   I4. After the loop, the in-progress candidate is always checked against the
 *       best, so the last climb is never silently dropped.
 *   I5. Negative-sum reset: whenever currentGain < 0 at any step, currentStart = i + 1
 *       and currentGain = 0 immediately. A candidate window must never retain a
 *       strictly worse starting point (a negative-sum prefix). The tolerance mechanism
 *       governs segment fragmentation (when to finalise a candidate and report it),
 *       while the Kadane reset ensures windows always begin at an optimal baseline.
 *
 *
 * ── NET GAIN VS CUMULATIVE ASCENT ───────────────────────────────────────────
 *
 * Each detected segment reports two distinct elevation metrics:
 *   • gain (net gain): E[end] - E[start] = sum(delta[start..end-1]).
 *     Telescopes cleanly and equals the difference between start and end elevations.
 *     Any minor dips absorbed within tolerance reduce net gain.
 *   • totalAscentM (cumulative ascent): sum(delta[i]) for all delta[i] > 0 in [start..end-1].
 *     Represents total upward vertical meters climbed by an athlete, ignoring downhill dips.
 *
 *
 * Why tolerance = 3m (default):
 *   GPS-recorded elevation typically has ±2–5m random jitter even on flat roads.
 *   After a 5-point centred moving-average smoothing pass, residual noise dips
 *   are typically under 1m.  The 3m threshold therefore absorbs genuine GPS
 *   noise and minor rollers ("false flats") common in hilly terrain, while
 *   reliably splitting climbs separated by any real valley (which will produce
 *   a dip >> 3m).  It is user-configurable per-request for experimentation.
 *
 *
 * ── TIME AND SPACE COMPLEXITY ────────────────────────────────────────────────
 *
 *   Time:  O(n) — a single left-to-right scan over the delta array.
 *   Space: O(k) — where k is the number of candidate segments finalised
 *                 (needed only for tie-detection; O(1) if ties are not tracked).
 *
 * In practice k << n for any real route, so effective space is O(1).
 *
 *
 * ── RECOVERY (MAXIMUM DESCENT) DETECTION ─────────────────────────────────────
 *
 * The identical algorithm detects the maximum sustained descent by negating
 * all deltas before the scan.  Negating transforms descents into ascending
 * deltas and vice-versa, so the exact same convergence logic applies.
 * This is not a separate algorithm — it is a single parameterised call with
 * {@code negate = true}.
 *
 *
 * ── SIGNIFICANCE THRESHOLDS ──────────────────────────────────────────────────
 *
 * A detected segment is only reported as "significant" if it satisfies BOTH:
 *   • netGain     >= minSignificantGain  (default 20m)  — filters noise bumps
 *   • avgGrade    >= minSignificantGrade (default 1.5%) — filters long flats
 *                                                         masquerading as climbs
 *
 *
 * ── THREAD SAFETY ────────────────────────────────────────────────────────────
 *
 * This class is stateless (no instance fields). All state is local to each
 * {@code run()} invocation. Safe to share as a singleton Spring bean.
 */
public class ToleranceKadaneEngine {

    /**
     * IEEE 754 floating-point comparison tolerance.
     * Two gain values within this distance are treated as equal (a tie).
     */
    private static final double FLOAT_TOLERANCE = 1e-6;

    // ─────────────────────────────────────────────────────────────────────────
    // Public API
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Result of running the algorithm: the best segment found (nullable if none
     * meets significance thresholds) and any alternate maxima (ties).
     */
    public static class Result {
        private final ClimbSegment bestSegment;          // nullable
        private final List<ClimbSegment> alternateMaxima; // empty if no ties
        private final boolean significant;

        public Result(ClimbSegment bestSegment, List<ClimbSegment> alternateMaxima,
                      boolean significant) {
            this.bestSegment = bestSegment;
            this.alternateMaxima = alternateMaxima;
            this.significant = significant;
        }

        public ClimbSegment getBestSegment() { return bestSegment; }
        public List<ClimbSegment> getAlternateMaxima() { return alternateMaxima; }
        public boolean isSignificant() { return significant; }
    }

    /**
     * Find the maximum sustained elevation gain segment.
     *
     * @param points           preprocessed route points (smoothedElevation must be set)
     * @param cumDist          cumulative distance prefix-sum array (meters)
     * @param descentTolerance maximum cumulative descent (meters) absorbed within a climb
     *                         before the climb is considered broken and a restart occurs
     * @param minSignificantGain   minimum net gain (meters) for the result to be reported
     *                             as "significant"
     * @param minSignificantGrade  minimum average grade (%) for the result to be reported
     *                             as "significant"
     * @param minStepDistance  minimum step distance (meters) required to compute a grade
     * @return algorithm result
     */
    public Result findMaxClimb(List<RoutePoint> points, double[] cumDist,
                                double descentTolerance, double minSignificantGain,
                                double minSignificantGrade, double minStepDistance) {
        return run(points, cumDist, descentTolerance, minSignificantGain,
                   minSignificantGrade, minStepDistance, false, null, null);
    }

    /**
     * Find the maximum sustained elevation loss (recovery) segment.
     * <p>
     * Delegates to {@link #run} with {@code negate = true}: all deltas are
     * negated, transforming the descent-detection problem back into a
     * climb-detection problem with the identical algorithm.
     *
     * @param ascentTolerance maximum cumulative ascent (meters) absorbed within
     *                        a descent before the descent is considered broken
     */
    public Result findMaxRecovery(List<RoutePoint> points, double[] cumDist,
                                   double ascentTolerance, double minSignificantGain,
                                   double minSignificantGrade, double minStepDistance) {
        return findMaxRecovery(points, cumDist, ascentTolerance, minSignificantGain,
                   minSignificantGrade, minStepDistance, null, null);
    }

    /**
     * Find the maximum sustained elevation loss (recovery) segment, optionally
     * excluding a given index window (such as the identified max climb segment)
     * so that climb and recovery segments are guaranteed to be disjoint.
     */
    public Result findMaxRecovery(List<RoutePoint> points, double[] cumDist,
                                   double ascentTolerance, double minSignificantGain,
                                   double minSignificantGrade, double minStepDistance,
                                   Integer excludeStart, Integer excludeEnd) {
        return run(points, cumDist, ascentTolerance, minSignificantGain,
                   minSignificantGrade, minStepDistance, true, excludeStart, excludeEnd);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Core implementation
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Core Kadane-with-tolerance implementation.
     *
     * @param negate if true, negate all deltas to detect descents instead of climbs.
     *               This is the legitimate algorithmic reuse for recovery detection.
     * @param excludeStart optional index start to exclude from candidate evaluation
     * @param excludeEnd   optional index end to exclude from candidate evaluation
     */
    private Result run(List<RoutePoint> points, double[] cumDist,
                       double tolerance, double minGain, double minGrade,
                       double minStepDist, boolean negate,
                       Integer excludeStart, Integer excludeEnd) {

        int n = points.size();
        if (n < 2) {
            return new Result(null, List.of(), false);
        }

        // ── Step 1: Build the delta array ─────────────────────────────────
        //
        // delta[i] = smoothedElevation[i+1] − smoothedElevation[i]
        //
        // By the telescoping property (documented in the class Javadoc),
        // sum(delta[i..j]) = E[j+1] − E[i], so maximising the subarray sum
        // directly maximises net elevation gain.  If negate=true, we flip the
        // sign so that descents become positive deltas and the same max-subarray
        // logic finds the maximum loss.
        //
        double[] delta = new double[n - 1];
        for (int i = 0; i < n - 1; i++) {
            double d = points.get(i + 1).getSmoothedElevation()
                     - points.get(i).getSmoothedElevation();
            delta[i] = negate ? -d : d;
        }

        // ── Step 2: Kadane's with bounded descent tolerance ───────────────
        //
        // Variables:
        //   currentGain          — running gain for the candidate starting at currentStart
        //   currentStart         — start index of the current candidate climb
        //   descentSinceLastPeak — cumulative descent since the last local high point
        //                          within the current candidate (resets to 0 on any climb)
        //   currentPeakEnd       — point index of the candidate's current peak
        //                          (i.e. where we would end if we finalised now)
        //
        double currentGain = 0;
        int currentStart = 0;
        double descentSinceLastPeak = 0;

        // currentPeakEnd tracks the index where the running gain was highest,
        // so finalisation captures the true summit rather than the next trough.
        int currentPeakEnd = 0;

        double bestGain = 0;
        int bestStart = 0;
        int bestEnd = 0;

        // All finalised candidates, kept for tie (alternate-maxima) detection.
        List<CandidateSegment> allCandidates = new ArrayList<>();

        for (int i = 0; i < delta.length; i++) {
            if (excludeStart != null && excludeEnd != null && excludeStart < excludeEnd
                    && i >= excludeStart && i < excludeEnd) {
                // Entering or inside the excluded segment: finalise any in-progress candidate
                if (currentGain > FLOAT_TOLERANCE) {
                    allCandidates.add(new CandidateSegment(
                            currentStart, currentPeakEnd, currentGain));
                    if (currentGain > bestGain + FLOAT_TOLERANCE) {
                        bestGain = currentGain;
                        bestStart = currentStart;
                        bestEnd = currentPeakEnd;
                    }
                }
                // Skip past the excluded range completely
                i = excludeEnd - 1; // loop increment will make next i = excludeEnd
                currentGain = 0;
                currentStart = excludeEnd;
                descentSinceLastPeak = 0;
                currentPeakEnd = excludeEnd;
                continue;
            }

            double d = delta[i];

            if (d >= 0) {
                // ── Ascending step (or exactly flat) ──────────────────────
                // Absorb into the running climb unconditionally.
                // Reset the descent accumulator: we're at a new high, so
                // previous descent since last peak is forgiven.
                currentGain += d;
                descentSinceLastPeak = 0;
                currentPeakEnd = i + 1; // Point index immediately after this delta

            } else {
                // ── Descending step ───────────────────────────────────────
                // Accumulate the magnitude of the dip.
                descentSinceLastPeak += (-d);  // d is negative, so -d > 0

                if (descentSinceLastPeak > tolerance) {
                    // ─ Tolerance exceeded: the climb is genuinely broken ──
                    //
                    // We finalise the candidate at currentPeakEnd (the last
                    // summit), NOT at i+1 (the current trough), because:
                    //   • The gain was computed up to the peak.
                    //   • Including the descent would reduce reported gain.
                    //   • Users want the "clean" sustained climb, not a segment
                    //     that includes the start of the subsequent descent.
                    //
                    if (currentGain > FLOAT_TOLERANCE) {
                        allCandidates.add(new CandidateSegment(
                                currentStart, currentPeakEnd, currentGain));

                        if (currentGain > bestGain + FLOAT_TOLERANCE) {
                            bestGain = currentGain;
                            bestStart = currentStart;
                            bestEnd = currentPeakEnd;
                        }
                        // If within FLOAT_TOLERANCE of bestGain: this is a tie.
                        // The best is already recorded; the alternate will be
                        // identified during the post-loop tie-scan below.
                    }

                    // ─ Restart from the point AFTER the current dip ───────
                    //
                    // Why i+1 and not i? Because delta[i] is the step from
                    // point i to point i+1. The next candidate starts at i+1.
                    currentGain = 0;
                    currentStart = i + 1;
                    descentSinceLastPeak = 0;
                    currentPeakEnd = i + 1;

                } else {
                    // ─ Small dip: absorbed into the running climb ─────────
                    //
                    // A dip within tolerance is treated as a minor roller, not
                    // a genuine break. The gain is reduced by the dip magnitude
                    // (delta[i] is negative, so += d subtracts), but the candidate
                    // window stays open. descentSinceLastPeak continues to
                    // accumulate — the NEXT ascent will reset it via the >= 0 branch.
                    currentGain += d;  // d < 0, so this reduces currentGain

                    // ─ Kadane Negative-Sum Reset (Invariant I5) ───────────
                    // The tolerance-based window must never keep a worse start point than an
                    // available better one. Whenever currentGain < 0 at any step (not only at
                    // array start), reset currentStart = i + 1 and currentGain = 0 immediately,
                    // regardless of whether descentSinceLastPeak has exceeded tolerance.
                    if (currentGain < 0) {
                        currentGain = 0;
                        currentStart = i + 1;
                        descentSinceLastPeak = 0;
                        currentPeakEnd = i + 1;
                    }
                }
            }
        }

        // ── Step 3: Finalise the last in-progress candidate ───────────────
        //
        // The loop above only finalises a candidate when tolerance is exceeded.
        // The climb still in progress at the end of the loop is checked here.
        // Invariant I4: this check is always required.
        //
        if (currentGain > FLOAT_TOLERANCE) {
            allCandidates.add(new CandidateSegment(
                    currentStart, currentPeakEnd, currentGain));
        }
        if (currentGain > bestGain + FLOAT_TOLERANCE) {
            bestGain = currentGain;
            bestStart = currentStart;
            bestEnd = currentPeakEnd;
        }

        // ── Step 4: No meaningful candidate found ────────────────────────
        if (bestGain <= FLOAT_TOLERANCE) {
            return new Result(null, List.of(), false);
        }

        // ── Step 5: Build the best ClimbSegment ──────────────────────────
        //
        // Average grade = net gain / horizontal distance × 100.
        // If the segment spans < minStepDist (degenerate), grade is 0.
        //
        double segLength = cumDist[bestEnd] - cumDist[bestStart];
        double avgGrade = segLength > minStepDist
                ? (bestGain / segLength) * 100.0
                : 0.0;

        // Significance check: BOTH gain and grade thresholds must be met.
        boolean significant = bestGain >= minGain && avgGrade >= minGrade;

        double bestTotalAscent = computeTotalAscent(delta, bestStart, bestEnd);

        ClimbSegment bestSegment = new ClimbSegment(
                bestStart, bestEnd,
                cumDist[bestStart], cumDist[bestEnd],
                roundTo2(bestGain), roundTo2(avgGrade), roundTo2(segLength),
                roundTo2(bestTotalAscent));

        // ── Step 6: Identify alternate maxima (ties) ─────────────────────
        //
        // Any candidate whose gain is within FLOAT_TOLERANCE of bestGain but
        // is not the identical (start, end) pair is an alternate maximum.
        // These are reported to the API consumer for transparency.
        //
        List<ClimbSegment> alternates = new ArrayList<>();
        for (CandidateSegment c : allCandidates) {
            if (Math.abs(c.gain - bestGain) <= FLOAT_TOLERANCE
                    && !(c.start == bestStart && c.end == bestEnd)) {
                double altLength = cumDist[c.end] - cumDist[c.start];
                double altGrade = altLength > minStepDist
                        ? (c.gain / altLength) * 100.0 : 0.0;
                double altTotalAscent = computeTotalAscent(delta, c.start, c.end);
                alternates.add(new ClimbSegment(
                        c.start, c.end,
                        cumDist[c.start], cumDist[c.end],
                        roundTo2(c.gain), roundTo2(altGrade), roundTo2(altLength),
                        roundTo2(altTotalAscent)));
            }
        }

        return new Result(bestSegment, alternates, significant);
    }

    /**
     * Compute cumulative vertical ascent across a segment window [start, end].
     * Sums all strictly positive step deltas (delta[i] > 0), ignoring downward dips.
     */
    private double computeTotalAscent(double[] delta, int start, int end) {
        double ascent = 0.0;
        for (int i = start; i < end && i < delta.length; i++) {
            if (delta[i] > 0) {
                ascent += delta[i];
            }
        }
        return ascent;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    /** Round to 2 decimal places for clean JSON output. */
    private double roundTo2(double v) {
        return Math.round(v * 100.0) / 100.0;
    }

    /**
     * Internal record of a finalised candidate segment.
     * Only used for tie-detection after the main loop.
     */
    private static class CandidateSegment {
        final int start;
        final int end;
        final double gain;

        CandidateSegment(int start, int end, double gain) {
            this.start = start;
            this.end = end;
            this.gain = gain;
        }
    }
}
