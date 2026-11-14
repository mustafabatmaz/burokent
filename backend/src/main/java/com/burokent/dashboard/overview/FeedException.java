package com.burokent.dashboard.overview;

/** A source answered with something we cannot read. */
class FeedException extends RuntimeException {

    FeedException(String message, Throwable cause) {
        super(message, cause);
    }

    FeedException(String message) {
        super(message);
    }
}
