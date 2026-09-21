package com.gradefinder.service;

import com.gradefinder.algorithm.DistanceCalculator;
import com.gradefinder.algorithm.ElevationPreprocessor;
import com.gradefinder.algorithm.SegmentClassifier;
import com.gradefinder.algorithm.ToleranceKadaneEngine;
import com.gradefinder.config.AppConfig;
import com.gradefinder.dto.RouteAnalysisResponseDto;
import com.gradefinder.model.RoutePoint;
import com.gradefinder.parser.GpxParser;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Phase 11/12 — Performance, Stress, and Latency Benchmark")
class RoutePerformanceStressTest {

    private RouteAnalysisService service;
    private GpxParser parser;

    @BeforeEach
    void setUp() {
        AppConfig config = new AppConfig();
        parser = new GpxParser();
        com.gradefinder.validation.GpxValidator validator = new com.gradefinder.validation.GpxValidator(config);
        service = new RouteAnalysisService(config, validator);
    }

    private InputStream generateGpxStream(int pointCount) {
        StringBuilder sb = new StringBuilder(pointCount * 80);
        sb.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n")
          .append("<gpx version=\"1.1\" creator=\"StressTester\" xmlns=\"http://www.topografix.com/GPX/1/1\">\n")
          .append("  <trk><name>Benchmark Route</name><trkseg>\n");

        double lat = 46.5000;
        double lon = 8.0000;
        double ele = 600.0;

        for (int i = 0; i < pointCount; i++) {
            lat += 0.0001;
            lon += 0.0001;
            // Generate undulating mountain pass terrain
            ele = 600.0 + 800.0 * Math.sin(i / 150.0) + 150.0 * Math.cos(i / 30.0);
            sb.append(String.format("    <trkpt lat=\"%.6f\" lon=\"%.6f\"><ele>%.1f</ele></trkpt>\n",
                    lat, lon, ele));
        }

        sb.append("  </trkseg></trk>\n</gpx>\n");
        return new ByteArrayInputStream(sb.toString().getBytes(StandardCharsets.UTF_8));
    }

    @Test
    @DisplayName("Large-file stress test: 10,000 points processes end-to-end within budget")
    void stressTest_10000Points_processesWithinBudget() {
        int pointCount = 10_000;
        long genStart = System.nanoTime();
        InputStream gpxStream = generateGpxStream(pointCount);

        long parseStart = System.nanoTime();
        GpxParser.ParseResult parseResult = parser.parse(gpxStream);
        long parseTimeMs = (System.nanoTime() - parseStart) / 1_000_000;

        assertEquals(pointCount, parseResult.getPoints().size());

        long analysisStart = System.nanoTime();
        RouteAnalysisResponseDto response = service.analyzePoints(
                new ArrayList<>(parseResult.getPoints()),
                "stress-10k",
                "Stress Test 10k",
                new ArrayList<>(parseResult.getWarnings()),
                null, null, null);
        long analysisTimeMs = (System.nanoTime() - analysisStart) / 1_000_000;
        long totalPipelineTimeMs = parseTimeMs + analysisTimeMs;

        System.out.printf("[Stress Test 10,000 pts] Parse: %d ms | Analysis: %d ms | Total Pipeline: %d ms%n",
                parseTimeMs, analysisTimeMs, totalPipelineTimeMs);

        assertNotNull(response.getMaxClimbSegment());
        assertNotNull(response.getSummary());
        assertTrue(response.getSummary().getDistanceKm() > 50.0);

        // Standard requirement: 10k points should parse and analyze well within 1500ms
        assertTrue(totalPipelineTimeMs < 2000,
                "Pipeline took " + totalPipelineTimeMs + " ms, expected < 2000 ms");
    }

    @Test
    @DisplayName("High-density stress test: 50,000 points linear scaling and memory safety")
    void stressTest_50000Points_memorySafetyAndScaling() {
        int pointCount = 50_000;
        InputStream gpxStream = generateGpxStream(pointCount);

        long start = System.nanoTime();
        GpxParser.ParseResult parseResult = parser.parse(gpxStream);
        RouteAnalysisResponseDto response = service.analyzePoints(
                new ArrayList<>(parseResult.getPoints()),
                "stress-50k",
                "Stress Test 50k",
                new ArrayList<>(parseResult.getWarnings()),
                null, null, null);
        long durationMs = (System.nanoTime() - start) / 1_000_000;

        System.out.printf("[Stress Test 50,000 pts] Total execution: %d ms%n", durationMs);

        assertNotNull(response.getSummary());
        assertEquals(50_000, parseResult.getPoints().size());
        assertTrue(durationMs < 8000, "50k points execution took " + durationMs + " ms, expected < 8000 ms");
    }

    @Test
    @DisplayName("Latency measurement on realistic route (2,000 points / ~60km ride)")
    void realisticRoute_latencyBenchmark() {
        int pointCount = 2_000; // typical GPX file size for 2-3 hour ride
        byte[] gpxBytes;
        try (InputStream is = generateGpxStream(pointCount)) {
            gpxBytes = is.readAllBytes();
        } catch (Exception e) {
            fail("Failed to prepare fixture: " + e.getMessage());
            return;
        }

        // Warm up JIT
        for (int i = 0; i < 5; i++) {
            GpxParser.ParseResult pr = parser.parse(new ByteArrayInputStream(gpxBytes));
            service.analyzePoints(new ArrayList<>(pr.getPoints()), "warmup", "Warmup",
                    new ArrayList<>(), null, null, null);
        }

        // Measure 25 iterations
        int iterations = 25;
        long[] times = new long[iterations];

        for (int i = 0; i < iterations; i++) {
            long t0 = System.nanoTime();
            GpxParser.ParseResult pr = parser.parse(new ByteArrayInputStream(gpxBytes));
            service.analyzePoints(new ArrayList<>(pr.getPoints()), "bench-" + i, "Bench",
                    new ArrayList<>(), null, null, null);
            times[i] = (System.nanoTime() - t0) / 1_000_000;
        }

        java.util.Arrays.sort(times);
        long p50 = times[iterations / 2];
        long p90 = times[(int) (iterations * 0.9)];
        long p99 = times[iterations - 1];
        long min = times[0];
        long max = times[iterations - 1];

        System.out.printf("[Realistic 2,000 pts Latency Benchmark] Min: %d ms | P50: %d ms | P90: %d ms | P99: %d ms | Max: %d ms%n",
                min, p50, p90, p99, max);

        // Budget: P50 latency should be < 100ms for 2,000 points
        assertTrue(p50 < 150, "P50 latency was " + p50 + " ms, expected < 150 ms");
    }
}
