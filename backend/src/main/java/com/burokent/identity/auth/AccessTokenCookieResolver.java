package com.burokent.identity.auth;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Arrays;
import org.jspecify.annotations.Nullable;
import org.springframework.security.oauth2.server.resource.web.BearerTokenResolver;

/**
 * Reads the access token from its cookie for admin API calls. Auth endpoints and the public API are skipped, so an
 * expired cookie never blocks login or refresh.
 */
class AccessTokenCookieResolver implements BearerTokenResolver {

    @Override
    public @Nullable String resolve(HttpServletRequest request) {
        String path = request.getRequestURI().substring(request.getContextPath().length());
        if (!path.startsWith("/api/admin/") || path.startsWith(AuthCookies.AUTH_PATH + "/")) {
            return null;
        }
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return null;
        }
        return Arrays.stream(cookies)
                .filter(cookie -> AuthCookies.ACCESS.equals(cookie.getName()))
                .map(Cookie::getValue)
                .filter(value -> !value.isBlank())
                .findFirst()
                .orElse(null);
    }
}
