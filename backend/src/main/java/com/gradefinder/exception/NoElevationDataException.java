package com.gradefinder.exception;

/**
 * Thrown when a GPX file has no elevation data on any point,
 * making elevation analysis impossible.
 */
public class NoElevationDataException extends RuntimeException {

    public NoElevationDataException(String message) {
        super(message);
    }
}
