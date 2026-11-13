package com.burokent.identity.auth;

import java.time.Duration;

final class AuthExceptions {

    private AuthExceptions() {}

    static class InvalidCredentialsException extends RuntimeException {}

    /** Missing, expired, revoked or reused refresh token, or a session whose user is gone. */
    static class InvalidSessionException extends RuntimeException {}

    static class TooManyAttemptsException extends RuntimeException {

        private final Duration retryAfter;

        TooManyAttemptsException(Duration retryAfter) {
            this.retryAfter = retryAfter;
        }

        Duration retryAfter() {
            return retryAfter;
        }
    }
}
