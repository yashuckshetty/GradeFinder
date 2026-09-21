package com.gradefinder.dto;

/**
 * Response DTO for route comparison.
 */
public class ComparisonResponseDto {
    private RouteAnalysisResponseDto routeA;
    private RouteAnalysisResponseDto routeB;
    private String summaryLine;  // Plain-language comparison summary

    public RouteAnalysisResponseDto getRouteA() { return routeA; }
    public void setRouteA(RouteAnalysisResponseDto v) { this.routeA = v; }
    public RouteAnalysisResponseDto getRouteB() { return routeB; }
    public void setRouteB(RouteAnalysisResponseDto v) { this.routeB = v; }
    public String getSummaryLine() { return summaryLine; }
    public void setSummaryLine(String v) { this.summaryLine = v; }
}
