package com.gradefinder.validation;

import com.gradefinder.config.AppConfig;
import com.gradefinder.exception.InvalidGpxException;
import com.gradefinder.model.RoutePoint;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;

/**
 * Pre-parsing and post-parsing validation for GPX uploads.
 * <p>
 * Pre-parsing: file extension, content type, file size.
 * Post-parsing: point count cap, coordinate range checks.
 */
@Component
public class GpxValidator {

    private final AppConfig config;

    public GpxValidator(AppConfig config) {
        this.config = config;
    }

    /**
     * Validate the uploaded file before any XML parsing.
     * Checks extension, content type, and size.
     */
    public void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new InvalidGpxException("INVALID_GPX", "No file provided.");
        }

        // Extension check
        String originalName = file.getOriginalFilename();
        if (originalName == null || !originalName.toLowerCase().endsWith(".gpx")) {
            throw new InvalidGpxException("UNSUPPORTED_FORMAT",
                    "Only .gpx files are supported. Received: " +
                    (originalName != null ? originalName : "unknown"));
        }

        // Content type check (lenient — some systems don't set GPX MIME correctly)
        String contentType = file.getContentType();
        if (contentType != null
                && !contentType.contains("xml")
                && !contentType.contains("gpx")
                && !contentType.equals("application/octet-stream")) {
            throw new InvalidGpxException("UNSUPPORTED_FORMAT",
                    "Unexpected content type: " + contentType +
                    ". Expected an XML-based GPX file.");
        }

        // Size check (application-level, in addition to server-level multipart config)
        if (file.getSize() > config.getValidation().getMaxFileSizeBytes()) {
            throw new InvalidGpxException("FILE_TOO_LARGE",
                    "File size (" + (file.getSize() / 1024 / 1024) +
                    " MB) exceeds the maximum allowed size of " +
                    (config.getValidation().getMaxFileSizeBytes() / 1024 / 1024) + " MB.");
        }
    }

    /**
     * Validate parsed points: count cap and coordinate ranges.
     * Returns warnings for any dropped points.
     */
    public List<String> validatePoints(List<RoutePoint> points) {
        List<String> warnings = new ArrayList<>();

        if (points.size() > config.getValidation().getMaxPointCount()) {
            throw new InvalidGpxException("INVALID_GPX",
                    "Route has " + points.size() + " points, which exceeds the maximum " +
                    "supported count of " + config.getValidation().getMaxPointCount() +
                    ". Please simplify the route or split it into smaller segments.");
        }

        if (points.size() == 0) {
            throw new InvalidGpxException("INVALID_GPX", "No valid track points found.");
        }

        if (points.size() == 1) {
            throw new InvalidGpxException("INSUFFICIENT_POINTS",
                    "Only 1 track point found. At least 2 points are needed to compute " +
                    "distance and elevation changes.");
        }

        // Coordinate range validation — drop invalid points, warn
        int droppedCount = 0;
        List<RoutePoint> validPoints = new ArrayList<>();
        for (RoutePoint p : points) {
            if (p.getLat() < -90 || p.getLat() > 90 || p.getLon() < -180 || p.getLon() > 180) {
                droppedCount++;
            } else {
                validPoints.add(p);
            }
        }

        if (droppedCount > 0) {
            warnings.add(droppedCount + " point(s) had coordinates outside valid ranges " +
                    "(lat: [-90, 90], lon: [-180, 180]) and were removed.");
        }

        // Replace original list contents with validated points
        points.clear();
        points.addAll(validPoints);

        if (points.size() < 2) {
            throw new InvalidGpxException("INSUFFICIENT_POINTS",
                    "After removing points with invalid coordinates, fewer than 2 " +
                    "valid points remain.");
        }

        if (points.size() == 2) {
            warnings.add("Only 2 track points present. Results are technically " +
                    "computable but statistically meaningless for climb detection.");
        }

        return warnings;
    }
}
