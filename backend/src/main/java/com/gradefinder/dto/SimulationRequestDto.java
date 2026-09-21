package com.gradefinder.dto;

/**
 * Request body for the simulation endpoint.
 */
public class SimulationRequestDto {
    private String routeId;
    private int excludeStartIndex;
    private int excludeEndIndex;

    public String getRouteId() { return routeId; }
    public void setRouteId(String v) { this.routeId = v; }
    public int getExcludeStartIndex() { return excludeStartIndex; }
    public void setExcludeStartIndex(int v) { this.excludeStartIndex = v; }
    public int getExcludeEndIndex() { return excludeEndIndex; }
    public void setExcludeEndIndex(int v) { this.excludeEndIndex = v; }
}
