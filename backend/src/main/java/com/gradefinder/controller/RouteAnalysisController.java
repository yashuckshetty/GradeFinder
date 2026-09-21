package com.gradefinder.controller;

import com.gradefinder.dto.*;
import com.gradefinder.service.RouteAnalysisService;
import com.gradefinder.service.RouteComparisonService;
import com.gradefinder.service.RouteSimulationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

/**
 * REST endpoints for route analysis. Contains no business logic — all
 * computation is delegated to the service layer.
 */
@RestController
@RequestMapping("/api/routes")
@CrossOrigin(origins = "*") // Dev convenience; restrict in production
public class RouteAnalysisController {

    private final RouteAnalysisService analysisService;
    private final RouteSimulationService simulationService;
    private final RouteComparisonService comparisonService;

    public RouteAnalysisController(RouteAnalysisService analysisService,
                                    RouteSimulationService simulationService,
                                    RouteComparisonService comparisonService) {
        this.analysisService = analysisService;
        this.simulationService = simulationService;
        this.comparisonService = comparisonService;
    }

    /**
     * POST /api/routes/analyze
     * Accepts either a multipart GPX file or a JSON body with demoRouteId.
     */
    @PostMapping("/analyze")
    public ResponseEntity<RouteAnalysisResponseDto> analyze(
            @RequestParam(value = "file", required = false) MultipartFile file,
            @RequestParam(value = "demoRouteId", required = false) String demoRouteId,
            @RequestParam(value = "descentTolerance", required = false) Double descentTolerance,
            @RequestParam(value = "minSignificantGain", required = false) Double minGain,
            @RequestParam(value = "minSignificantGrade", required = false) Double minGrade) {

        RouteAnalysisResponseDto result;

        if (file != null && !file.isEmpty()) {
            result = analysisService.analyzeFile(file, descentTolerance, minGain, minGrade);
        } else if (demoRouteId != null && !demoRouteId.isBlank()) {
            result = analysisService.analyzeDemo(demoRouteId, descentTolerance, minGain, minGrade);
        } else {
            return ResponseEntity.badRequest().build();
        }

        return ResponseEntity.ok(result);
    }

    /**
     * POST /api/routes/simulate
     * Splices out a segment and re-runs analysis.
     */
    @PostMapping("/simulate")
    public ResponseEntity<SimulationResponseDto> simulate(
            @RequestBody SimulationRequestDto request) {
        SimulationResponseDto result = simulationService.simulate(
                request.getRouteId(),
                request.getExcludeStartIndex(),
                request.getExcludeEndIndex());
        return ResponseEntity.ok(result);
    }

    /**
     * POST /api/routes/compare
     * Compares two routes side-by-side.
     */
    @PostMapping("/compare")
    public ResponseEntity<ComparisonResponseDto> compare(
            @RequestBody Map<String, String> request) {
        String routeAId = request.get("routeAId");
        String routeBId = request.get("routeBId");

        if (routeAId == null || routeBId == null) {
            return ResponseEntity.badRequest().build();
        }

        ComparisonResponseDto result = comparisonService.compare(routeAId, routeBId);
        return ResponseEntity.ok(result);
    }

    /**
     * GET /api/routes/demo
     * Lists available demo routes.
     */
    @GetMapping("/demo")
    public ResponseEntity<List<DemoRouteDto>> listDemos() {
        List<DemoRouteDto> demos = List.of(
            new DemoRouteDto("rolling-hills", "Rolling Hills",
                "Gentle rolling terrain with multiple small climbs and descents — tests that the algorithm correctly identifies the largest sustained climb among several candidates.",
                24.5),
            new DemoRouteDto("mountain-climb", "Mountain Climb",
                "A single long, steep mountain ascent — the classic use case. Tests straightforward climb detection.",
                18.2),
            new DemoRouteDto("long-gradual", "Long Gradual Ascent",
                "A very long but gentle uphill — tests that a low-grade climb with significant total gain is correctly detected.",
                35.0),
            new DemoRouteDto("multi-climb", "Multi-Climb Technical",
                "Two distinct climbs separated by a long flat valley — the key test case proving the descent-tolerance algorithm correctly splits them instead of bridging.",
                42.0),
            new DemoRouteDto("flat-route", "Flat Route",
                "A nearly flat route with negligible elevation change — exercises the 'no significant climb' path honestly.",
                15.0)
        );
        return ResponseEntity.ok(demos);
    }

    /**
     * GET /api/routes/demo/{id}
     * Analyzes and returns a specific demo route.
     */
    @GetMapping("/demo/{id}")
    public ResponseEntity<RouteAnalysisResponseDto> getDemo(@PathVariable String id) {
        RouteAnalysisResponseDto result = analysisService.analyzeDemo(id, null, null, null);
        return ResponseEntity.ok(result);
    }
}
