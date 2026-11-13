package com.burokent.shared.web;

import static org.assertj.core.api.Assertions.assertThat;

import com.burokent.TestcontainersConfiguration;
import java.net.HttpCookie;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.client.RestClient;

/**
 * Behind the proxies the client's address arrives in X-Forwarded-For; the login rate limit and the activity log
 * must see that address, not the proxy's. Runs on a real server, where Tomcat reads the header.
 */
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@Import(TestcontainersConfiguration.class)
class ForwardedHeadersTests {

    @LocalServerPort
    int port;

    @Autowired
    JdbcTemplate jdbc;

    @Test
    void recordsTheClientAddressSentByTheProxy() {
        RestClient client = RestClient.create("http://localhost:" + port);
        List<String> setCookies = client.get()
                .uri("/api/admin/auth/csrf")
                .retrieve()
                .toBodilessEntity()
                .getHeaders()
                .get(HttpHeaders.SET_COOKIE);
        String csrf = HttpCookie.parse(setCookies.getFirst()).getFirst().getValue();
        String username = "forwarded-" + UUID.randomUUID().toString().substring(0, 8);

        client.post()
                .uri("/api/admin/auth/login")
                .header(HttpHeaders.COOKIE, "XSRF-TOKEN=" + csrf)
                .header("X-XSRF-TOKEN", csrf)
                .header("X-Forwarded-For", "203.0.113.7")
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"username\": \"%s\", \"password\": \"wrong-password-123\"}".formatted(username))
                .retrieve()
                .onStatus(status -> status.value() == 401, (request, response) -> {})
                .toBodilessEntity();

        assertThat(jdbc.queryForObject(
                        "select ip from audit_events where action = 'auth.login_failed' and entity_label = ?",
                        String.class,
                        username))
                .isEqualTo("203.0.113.7");
    }
}
