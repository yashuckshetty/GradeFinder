package com.gradefinder.dto;

/**
 * Summary info for a demo route in the listing.
 */
public class DemoRouteDto {
    private String id;
    private String name;
    private String description;
    private double distanceKm;

    public DemoRouteDto() {}

    public DemoRouteDto(String id, String name, String description, double distanceKm) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.distanceKm = distanceKm;
    }

    public String getId() { return id; }
    public void setId(String v) { this.id = v; }
    public String getName() { return name; }
    public void setName(String v) { this.name = v; }
    public String getDescription() { return description; }
    public void setDescription(String v) { this.description = v; }
    public double getDistanceKm() { return distanceKm; }
    public void setDistanceKm(double v) { this.distanceKm = v; }
}
