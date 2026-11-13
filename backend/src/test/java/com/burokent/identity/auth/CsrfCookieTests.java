package com.burokent.identity.auth;

import static org.assertj.core.api.Assertions.assertThat;

import com.burokent.TestcontainersConfiguration;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestClient;

/**
 * Runs against a real server: the MockMvc csrf() helper replaces the token repository, so the XSRF-TOKEN cookie can
 * only be observed over HTTP.
 */
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@Import(TestcontainersConfiguration.class)
class CsrfCookieTests {

    @LocalServerPort
    int port;

    @Test
    void csrfEndpointIssuesTokenCookieReadableByScripts() {
        ResponseEntity<Void> response = RestClient.create("http://localhost:" + port)
                .get()
                .uri("/api/admin/auth/csrf")
                .retrieve()
                .toBodilessEntity();

        assertThat(response.getStatusCode().value()).isEqualTo(204);
        assertThat(response.getHeaders().get(HttpHeaders.SET_COOKIE))
                .singleElement()
                .asString()
                .startsWith("XSRF-TOKEN=")
                .contains("Path=/")
                .doesNotContain("HttpOnly");
    }
}
