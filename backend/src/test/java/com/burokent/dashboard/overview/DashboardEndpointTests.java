package com.burokent.dashboard.overview;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.burokent.TestcontainersConfiguration;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

/** Tests never reach the real sources: the feeds are switched off, so the panel gets empty cards. */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class DashboardEndpointTests {

    @Autowired
    MockMvc mvc;

    @Test
    void everyLoggedInUserGetsTheCardsWithTheirSources() throws Exception {
        Cookie access = mvc.perform(post("/api/admin/auth/login")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\": \"%s\", \"password\": \"%s\"}"
                                .formatted(
                                        TestcontainersConfiguration.BOOTSTRAP_ADMIN_USERNAME,
                                        TestcontainersConfiguration.BOOTSTRAP_ADMIN_PASSWORD)))
                .andReturn()
                .getResponse()
                .getCookie("__Host-bk_access");

        mvc.perform(get("/api/admin/dashboard").cookie(access))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rates").doesNotExist())
                .andExpect(jsonPath("$.weather").doesNotExist())
                .andExpect(jsonPath("$.location").value("Antakya"));
    }

    @Test
    void needsALogin() throws Exception {
        mvc.perform(get("/api/admin/dashboard")).andExpect(status().isUnauthorized());
    }
}
