package com.gradefinder.model;

/**
 * Classification of a route zone: climbing, descending, or flat.
 * Used by SegmentClassifier to produce a zone map over the route.
 */
public enum ZoneType {
    CLIMBING,
    DESCENDING,
    FLAT
}
