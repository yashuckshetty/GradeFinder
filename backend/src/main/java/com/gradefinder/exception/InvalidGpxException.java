package com.gradefinder.exception;

/**
 * Thrown when a GPX file is structurally invalid, malformed, or fails
 * security validation (e.g., XXE attempt, DOCTYPE present).
 */
public class InvalidGpxException extends RuntimeException {
    private final String errorCode;

    public InvalidGpxException(String errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }

    public InvalidGpxException(String errorCode, String message, Throwable cause) {
        super(message, cause);
        this.errorCode = errorCode;
    }

    public String getErrorCode() { return errorCode; }
}
