package com.burokent.identity.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.burokent.MutableClock;
import com.burokent.TestcontainersConfiguration;
import jakarta.servlet.http.Cookie;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.convention.TestBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class AuthFlowTests {

    private static final String ACCESS_COOKIE = "__Host-bk_access";
    private static final String REFRESH_COOKIE = "__Secure-bk_refresh";

    private static final String USER = "regular-user";
    private static final String ARCHIVED_USER = "archived-user";
    private static final String PASSWORD = "regular-user-password";

    private static final MutableClock CLOCK = new MutableClock(Instant.now());

    @TestBean
    Clock clock;

    static Clock clock() {
        return CLOCK;
    }

    @Autowired
    MockMvc mvc;

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    PasswordEncoder passwordEncoder;

    @BeforeEach
    void setUp() {
        CLOCK.setInstant(Instant.now());
        insertUser(USER, false);
        insertUser(ARCHIVED_USER, true);
    }

    @Test
    void loginSetsSessionCookiesAndMeReturnsUser() throws Exception {
        MockHttpServletResponse response = login(USER, PASSWORD, "10.0.0.1");

        assertThat(response.getStatus()).isEqualTo(204);
        assertThat(setCookie(response, ACCESS_COOKIE))
                .contains("Path=/;", "Max-Age=900", "Secure", "HttpOnly", "SameSite=Strict");
        assertThat(setCookie(response, REFRESH_COOKIE))
                .contains("Path=/api/admin/auth;", "Max-Age=2592000", "Secure", "HttpOnly", "SameSite=Strict");

        mvc.perform(get("/api/admin/me").cookie(response.getCookie(ACCESS_COOKIE)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value(USER))
                .andExpect(jsonPath("$.superAdmin").value(false))
                .andExpect(jsonPath("$.permissions").isEmpty());
    }

    @Test
    void wrongPasswordAndUnknownUserGetTheSameError() throws Exception {
        MockHttpServletResponse wrongPassword = login(USER, "wrong-password-123", "10.0.0.2");
        MockHttpServletResponse unknownUser = login("nobody", PASSWORD, "10.0.0.2");

        assertThat(wrongPassword.getStatus()).isEqualTo(401);
        assertThat(wrongPassword.getContentAsString()).contains("\"code\":\"invalid_credentials\"");
        assertThat(unknownUser.getStatus()).isEqualTo(401);
        assertThat(unknownUser.getContentAsString()).isEqualTo(wrongPassword.getContentAsString());
    }

    @Test
    void archivedUserCannotLogIn() throws Exception {
        MockHttpServletResponse response = login(ARCHIVED_USER, PASSWORD, "10.0.0.3");

        assertThat(response.getStatus()).isEqualTo(401);
        assertThat(response.getContentAsString()).contains("\"code\":\"invalid_credentials\"");
    }

    @Test
    void authEndpointsRequireCsrfToken() throws Exception {
        for (String endpoint : List.of("login", "refresh", "logout")) {
            mvc.perform(post("/api/admin/auth/" + endpoint)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(credentials(USER, PASSWORD)))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.code").value("csrf_invalid"));
        }
    }

    @Test
    void refreshRotatesTokensAndReuseRevokesTheFamily() throws Exception {
        Cookie firstRefresh = login(USER, PASSWORD, "10.0.0.4").getCookie(REFRESH_COOKIE);

        MockHttpServletResponse rotated = refresh(firstRefresh);
        assertThat(rotated.getStatus()).isEqualTo(204);
        Cookie secondRefresh = rotated.getCookie(REFRESH_COOKIE);
        assertThat(secondRefresh.getValue()).isNotEqualTo(firstRefresh.getValue());
        assertThat(rotated.getCookie(ACCESS_COOKIE)).isNotNull();

        assertThat(refresh(firstRefresh).getStatus()).isEqualTo(401);
        assertThat(refresh(secondRefresh).getStatus()).isEqualTo(401);
    }

    @Test
    void logoutRevokesSessionAndClearsCookies() throws Exception {
        Cookie refreshCookie = login(USER, PASSWORD, "10.0.0.5").getCookie(REFRESH_COOKIE);

        MockHttpServletResponse response = mvc.perform(
                        post("/api/admin/auth/logout").with(csrf()).cookie(refreshCookie))
                .andExpect(status().isNoContent())
                .andReturn()
                .getResponse();

        assertThat(setCookie(response, ACCESS_COOKIE)).contains("Max-Age=0");
        assertThat(setCookie(response, REFRESH_COOKIE)).contains("Max-Age=0");
        assertThat(refresh(refreshCookie).getStatus()).isEqualTo(401);
    }

    @Test
    void sixthFailedAttemptIsRateLimited() throws Exception {
        for (int attempt = 1; attempt <= 5; attempt++) {
            assertThat(login(USER, "wrong-password-123", "10.0.0.6").getStatus())
                    .isEqualTo(401);
        }

        mvc.perform(loginRequest(USER, PASSWORD, "10.0.0.6"))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists(HttpHeaders.RETRY_AFTER))
                .andExpect(jsonPath("$.code").value("too_many_attempts"));
    }

    @Test
    void successfulLoginResetsTheFailureCounter() throws Exception {
        for (int attempt = 1; attempt <= 4; attempt++) {
            login(USER, "wrong-password-123", "10.0.0.7");
        }
        assertThat(login(USER, PASSWORD, "10.0.0.7").getStatus()).isEqualTo(204);

        for (int attempt = 1; attempt <= 4; attempt++) {
            assertThat(login(USER, "wrong-password-123", "10.0.0.7").getStatus())
                    .isEqualTo(401);
        }
    }

    @Test
    void expiredAccessTokenIsRejected() throws Exception {
        Cookie access = login(USER, PASSWORD, "10.0.0.8").getCookie(ACCESS_COOKIE);

        CLOCK.advance(Duration.ofMinutes(16));

        mvc.perform(get("/api/admin/me").cookie(access))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("unauthorized"));
    }

    @Test
    void adminApiRequiresLogin() throws Exception {
        mvc.perform(get("/api/admin/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(header().string(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_PROBLEM_JSON_VALUE))
                .andExpect(jsonPath("$.code").value("unauthorized"));
    }

    @Test
    void healthIsPublic() throws Exception {
        mvc.perform(get("/actuator/health")).andExpect(status().isOk());
    }

    private MockHttpServletResponse login(String username, String password, String ip) throws Exception {
        return mvc.perform(loginRequest(username, password, ip)).andReturn().getResponse();
    }

    private MockHttpServletRequestBuilder loginRequest(String username, String password, String ip) {
        return post("/api/admin/auth/login")
                .with(csrf())
                .with(request -> {
                    request.setRemoteAddr(ip);
                    return request;
                })
                .contentType(MediaType.APPLICATION_JSON)
                .content(credentials(username, password));
    }

    private MockHttpServletResponse refresh(Cookie refreshCookie) throws Exception {
        return mvc.perform(post("/api/admin/auth/refresh").with(csrf()).cookie(refreshCookie))
                .andReturn()
                .getResponse();
    }

    private static String credentials(String username, String password) {
        return "{\"username\": \"%s\", \"password\": \"%s\"}".formatted(username, password);
    }

    private static String setCookie(MockHttpServletResponse response, String name) {
        return response.getHeaders(HttpHeaders.SET_COOKIE).stream()
                .filter(header -> header.startsWith(name + "="))
                .findFirst()
                .orElseThrow(() -> new AssertionError("No Set-Cookie for " + name));
    }

    private void insertUser(String username, boolean archived) {
        jdbc.update("""
                insert into users (username, display_name, password_hash, password_changed_at, archived_at)
                values (?, ?, ?, now(), case when ? then now() end)
                on conflict (username) do nothing
                """, username, username, passwordEncoder.encode(PASSWORD), archived);
    }
}
