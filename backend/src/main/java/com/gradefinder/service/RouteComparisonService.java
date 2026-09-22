package com.gradefinder.service;

import com.gradefinder.dto.ComparisonResponseDto;
import com.gradefinder.dto.RouteAnalysisResponseDto;
import org.springframework.stereotype.Service;

/**
 * Runs analysis on two routes independently and builds a comparison DTO
 * with a plain-language summary line.
 */
@Service
public class RouteComparisonService {

    private final RouteAnalysisService analysisService;

    public RouteComparisonService(RouteAnalysisService analysisService) {
        this.analysisService = analysisService;
    }

    public ComparisonResponseDto compare(String routeAId, String routeBId) {
        RouteAnalysisResponseDto a = analysisService.getOrAnalyzeRoute(routeAId);
        RouteAnalysisResponseDto b = analysisService.getOrAnalyzeRoute(routeBId);

        ComparisonResponseDto response = new ComparisonResponseDto();
        response.setRouteA(a);
        response.setRouteB(b);
        response.setSummaryLine(buildSummary(a, b));
        return response;
    }

    private String buildSummary(RouteAnalysisResponseDto a, RouteAnalysisResponseDto b) {
        String nameA = a.getRouteName() != null ? a.getRouteName() : "Route A";
        String nameB = b.getRouteName() != null ? b.getRouteName() : "Route B";

        if (!a.isHasSignificantClimb() && !b.isHasSignificantClimb()) {
            return "Neither route has a significant sustained climb.";
        }
        if (!a.isHasSignificantClimb()) {
            return nameB + " has the harder climb — " + nameA + " has no significant climb.";
        }
        if (!b.isHasSignificantClimb()) {
            return nameA + " has the harder climb — " + nameB + " has no significant climb.";
        }

        double gainA = a.getMaxClimbSegment().getGainM();
        double gainB = b.getMaxClimbSegment().getGainM();
        double diff = Math.abs(gainA - gainB);

        if (diff < 1.0) {
            return "Both routes have nearly identical hardest climbs (" +
                    gainA + "m vs " + gainB + "m gain).";
        }

        if (gainA > gainB) {
            return nameA + " has the harder single climb: " +
                    gainA + "m gain at " + a.getMaxClimbSegment().getAvgGradePercent() +
                    "% vs " + gainB + "m at " + b.getMaxClimbSegment().getAvgGradePercent() +
                    "% — a difference of " + round2(diff) + "m.";
        } else {
            return nameB + " has the harder single climb: " +
                    gainB + "m gain at " + b.getMaxClimbSegment().getAvgGradePercent() +
                    "% vs " + gainA + "m at " + a.getMaxClimbSegment().getAvgGradePercent() +
                    "% — a difference of " + round2(diff) + "m.";
        }
    }

    private double round2(double v) {
        return Math.round(v * 100.0) / 100.0;
    }
}
