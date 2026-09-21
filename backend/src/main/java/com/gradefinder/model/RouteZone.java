package com.gradefinder.model;

/**
 * A contiguous zone of the route classified by terrain type.
 */
public class RouteZone {
    private final int startIndex;
    private final int endIndex;
    private final ZoneType type;

    public RouteZone(int startIndex, int endIndex, ZoneType type) {
        this.startIndex = startIndex;
        this.endIndex = endIndex;
        this.type = type;
    }

    public int getStartIndex() { return startIndex; }
    public int getEndIndex() { return endIndex; }
    public ZoneType getType() { return type; }
}
