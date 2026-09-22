package com.gradefinder.service;

import com.gradefinder.config.AppConfig;
import com.gradefinder.dto.RouteAnalysisResponseDto;
import com.gradefinder.validation.GpxValidator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.*;

class RouteAnalysisServiceTest {

    private RouteAnalysisService service;

    @BeforeEach
    void setUp() {
        AppConfig config = new AppConfig();
        GpxValidator validator = new GpxValidator(config);
        service = new RouteAnalysisService(config, validator);
    }

    private MockMultipartFile createMockGpx(String filename, double baseEle, double stepGain) {
        StringBuilder xml = new StringBuilder("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n")
                .append("<gpx version=\"1.1\" creator=\"GradeFinderTest\">\n  <trk>\n    <name>")
                .append(filename).append("</name>\n    <trkseg>\n");
        for (int i = 0; i < 10; i++) {
            xml.append("      <trkpt lat=\"").append(45.0 + i * 0.001)
               .append("\" lon=\"6.000\"><ele>")
               .append(baseEle + i * stepGain)
               .append("</ele></trkpt>\n");
        }
        xml.append("    </trkseg>\n  </trk>\n</gpx>");
        return new MockMultipartFile("file", filename, "application/gpx+xml", xml.toString().getBytes(StandardCharsets.UTF_8));
    }

    @Test
    @DisplayName("Distinct file uploads receive distinct UUIDs and don't collide in cache")
    void analyzeFile_distinctUploads_generatesUniqueKeysAndNoCollision() {
        MockMultipartFile fileA = createMockGpx("route.gpx", 100.0, 200.0);
        MockMultipartFile fileB = createMockGpx("route.gpx", 300.0, 500.0); // Same filename, different elevations

        RouteAnalysisResponseDto resA = service.analyzeFile(fileA, null, null, null);
        RouteAnalysisResponseDto resB = service.analyzeFile(fileB, null, null, null);

        // Keys must be distinct UUIDs, not matching filenames
        assertNotNull(resA.getRouteId());
        assertNotNull(resB.getRouteId());
        assertNotEquals(resA.getRouteId(), resB.getRouteId(),
                "Two uploads (even with identical filename) must have distinct UUID keys");

        // Both routes must be independently accessible via getOrAnalyzeRoute
        RouteAnalysisResponseDto fetchedA = service.getOrAnalyzeRoute(resA.getRouteId());
        RouteAnalysisResponseDto fetchedB = service.getOrAnalyzeRoute(resB.getRouteId());

        assertNotNull(fetchedA);
        assertNotNull(fetchedB);
        assertEquals(resA.getSummary().getTotalGainM(), fetchedA.getSummary().getTotalGainM(), 0.01,
                "Route A fetched from cache must match original Route A upload");
        assertEquals(resB.getSummary().getTotalGainM(), fetchedB.getSummary().getTotalGainM(), 0.01,
                "Route B fetched from cache must match original Route B upload");
        assertNotEquals(fetchedA.getSummary().getTotalGainM(), fetchedB.getSummary().getTotalGainM(),
                "Route A and Route B must maintain independent, non-colliding elevation gains");
    }
}
