package com.burokent.identity.auth;

import java.time.Duration;
import org.springframework.http.ResponseCookie;

/** Names and attributes of the session cookies. The refresh cookie is only sent to the auth endpoints. */
final class AuthCookies {

    static final String ACCESS = "__Host-bk_access";
    static final String REFRESH = "__Secure-bk_refresh";
    static final String AUTH_PATH = "/api/admin/auth";

    private AuthCookies() {}

    static ResponseCookie access(String token, Duration maxAge) {
        return cookie(ACCESS, token, "/", maxAge);
    }

    static ResponseCookie refresh(String token, Duration maxAge) {
        return cookie(REFRESH, token, AUTH_PATH, maxAge);
    }

    static ResponseCookie clearAccess() {
        return cookie(ACCESS, "", "/", Duration.ZERO);
    }

    static ResponseCookie clearRefresh() {
        return cookie(REFRESH, "", AUTH_PATH, Duration.ZERO);
    }

    private static ResponseCookie cookie(String name, String value, String path, Duration maxAge) {
        return ResponseCookie.from(name, value)
                .httpOnly(true)
                .secure(true)
                .sameSite("Strict")
                .path(path)
                .maxAge(maxAge)
                .build();
    }
}
