package com.burokent.shared.web;

import static org.assertj.core.api.Assertions.assertThat;

import com.burokent.TestcontainersConfiguration;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@SpringBootTest
@AutoConfigureMockMvc
@Import({TestcontainersConfiguration.class, ApiConventionsTests.ProbeController.class})
class ApiConventionsTests {

    @Autowired
    MockMvcTester mvc;

    @Test
    void validationErrorIsProblemDetailWithCodes() {
        assertThat(mvc.post()
                        .uri("/api/admin/probe")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\": \"\"}"))
                .hasStatus(400)
                .hasContentType(MediaType.APPLICATION_PROBLEM_JSON)
                .bodyJson()
                .isLenientlyEqualTo("""
                        {"status": 400, "code": "validation_failed", "errors": [{"field": "name", "code": "not_blank"}]}
                        """);
    }

    @Test
    void publicSpecContainsOnlyPublicPaths() {
        assertThat(mvc.get().uri("/v3/api-docs/public"))
                .hasStatusOk()
                .bodyJson()
                .extractingPath("$.paths")
                .asMap()
                .containsOnlyKeys("/api/public/probe");
    }

    @Test
    void adminSpecContainsOnlyAdminPaths() {
        assertThat(mvc.get().uri("/v3/api-docs/admin"))
                .hasStatusOk()
                .bodyJson()
                .extractingPath("$.paths")
                .asMap()
                .containsOnlyKeys("/api/admin/probe");
    }

    record ProbeRequest(@NotBlank String name) {}

    @RestController
    static class ProbeController {

        @GetMapping("/api/public/probe")
        String publicProbe() {
            return "ok";
        }

        @PostMapping("/api/admin/probe")
        String adminProbe(@Valid @RequestBody ProbeRequest request) {
            return request.name();
        }
    }
}
