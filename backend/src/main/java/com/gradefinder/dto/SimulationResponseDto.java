package com.gradefinder.dto;

import java.util.Map;

/**
 * Response DTO for simulation: before, after, and delta.
 */
public class SimulationResponseDto {
    private RouteAnalysisResponseDto before;
    private RouteAnalysisResponseDto after;
    private Map<String, Object> delta;

    public RouteAnalysisResponseDto getBefore() { return before; }
    public void setBefore(RouteAnalysisResponseDto v) { this.before = v; }
    public RouteAnalysisResponseDto getAfter() { return after; }
    public void setAfter(RouteAnalysisResponseDto v) { this.after = v; }
    public Map<String, Object> getDelta() { return delta; }
    public void setDelta(Map<String, Object> v) { this.delta = v; }
}
