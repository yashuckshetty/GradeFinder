package com.gradefinder.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Map;

/**
 * Maps all application exceptions to a consistent JSON error shape:
 * { "error": "ERROR_CODE", "message": "Human-readable explanation" }
 *
 * 4xx = client input problem; 5xx = logged server-side, generic message to client.
 */
@ControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(InvalidGpxException.class)
    public ResponseEntity<Map<String, String>> handleInvalidGpx(InvalidGpxException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", ex.getErrorCode(), "message", ex.getMessage()));
    }

    @ExceptionHandler(NoElevationDataException.class)
    public ResponseEntity<Map<String, String>> handleNoElevation(NoElevationDataException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", "NO_ELEVATION_DATA", "message", ex.getMessage()));
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<Map<String, String>> handleFileTooLarge(MaxUploadSizeExceededException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", "FILE_TOO_LARGE",
                        "message", "File exceeds the maximum allowed size of 10 MB."));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleIllegalArgument(IllegalArgumentException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", "INVALID_PARAMETER", "message", ex.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleGeneric(Exception ex) {
        // Log full details server-side; return only generic message to client
        log.error("Unhandled exception during request processing", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "INTERNAL_ERROR",
                        "message", "An unexpected error occurred. Please try again."));
    }
}
