package com.burokent.identity.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.Nullable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(AuthCookies.AUTH_PATH)
@RequiredArgsConstructor
class AuthController {

    private final AuthService auth;

    record LoginRequest(@NotBlank String username, @NotBlank String password) {}

    /** Makes sure the XSRF-TOKEN cookie is set before the first state-changing request. */
    @GetMapping("/csrf")
    ResponseEntity<Void> csrf(CsrfToken token) {
        token.getToken();
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/login")
    ResponseEntity<Void> login(@Valid @RequestBody LoginRequest request, HttpServletRequest http) {
        return withSession(auth.login(
                request.username(), request.password(), http.getRemoteAddr(), http.getHeader(HttpHeaders.USER_AGENT)));
    }

    @PostMapping("/refresh")
    ResponseEntity<Void> refresh(
            @CookieValue(name = AuthCookies.REFRESH, required = false) @Nullable String refreshToken,
            HttpServletRequest http) {
        return withSession(auth.refresh(refreshToken, http.getRemoteAddr(), http.getHeader(HttpHeaders.USER_AGENT)));
    }

    @PostMapping("/logout")
    ResponseEntity<Void> logout(
            @CookieValue(name = AuthCookies.REFRESH, required = false) @Nullable String refreshToken) {
        auth.logout(refreshToken);
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, AuthCookies.clearAccess().toString())
                .header(HttpHeaders.SET_COOKIE, AuthCookies.clearRefresh().toString())
                .build();
    }

    private static ResponseEntity<Void> withSession(AuthService.Session session) {
        return ResponseEntity.noContent()
                .header(
                        HttpHeaders.SET_COOKIE,
                        AuthCookies.access(session.accessToken(), session.accessTokenMaxAge())
                                .toString())
                .header(
                        HttpHeaders.SET_COOKIE,
                        AuthCookies.refresh(session.refreshToken(), session.refreshTokenMaxAge())
                                .toString())
                .build();
    }
}
