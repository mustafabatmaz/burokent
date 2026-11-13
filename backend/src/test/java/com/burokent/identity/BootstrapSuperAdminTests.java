package com.burokent.identity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.burokent.TestcontainersConfiguration;
import jakarta.servlet.http.Cookie;
import java.util.Map;
import liquibase.integration.spring.SpringLiquibase;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.core.io.DefaultResourceLoader;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.postgresql.PostgreSQLContainer;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class BootstrapSuperAdminTests {

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    MockMvc mvc;

    @Test
    void createsSuperAdminFromParameters() {
        Map<String, Object> admin = jdbc.queryForMap(
                "select super_admin, password_hash from users where username = ?",
                TestcontainersConfiguration.BOOTSTRAP_ADMIN_USERNAME);

        assertThat(admin.get("super_admin")).isEqualTo(true);
        assertThat((String) admin.get("password_hash")).startsWith("{bcrypt}");
    }

    @Test
    void superAdminCanLogIn() throws Exception {
        Cookie access = mvc.perform(post("/api/admin/auth/login")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\": \"%s\", \"password\": \"%s\"}"
                                .formatted(
                                        TestcontainersConfiguration.BOOTSTRAP_ADMIN_USERNAME,
                                        TestcontainersConfiguration.BOOTSTRAP_ADMIN_PASSWORD)))
                .andExpect(status().isNoContent())
                .andReturn()
                .getResponse()
                .getCookie("__Host-bk_access");

        mvc.perform(get("/api/admin/me").cookie(access))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.superAdmin").value(true));
    }

    @Test
    void emptyBootstrapParametersHaltTheMigration() {
        try (PostgreSQLContainer postgres = TestcontainersConfiguration.newPostgres()) {
            postgres.start();
            SpringLiquibase liquibase = new SpringLiquibase();
            liquibase.setDataSource(new DriverManagerDataSource(
                    postgres.getJdbcUrl(),
                    TestcontainersConfiguration.OWNER_USER,
                    TestcontainersConfiguration.OWNER_PASSWORD));
            liquibase.setResourceLoader(new DefaultResourceLoader());
            liquibase.setChangeLog("classpath:db/changelog/db.changelog-master.yaml");
            liquibase.setChangeLogParameters(Map.of(
                    "owner_user",
                    TestcontainersConfiguration.OWNER_USER,
                    "app_user",
                    TestcontainersConfiguration.APP_USER,
                    "bootstrap_admin_username",
                    "",
                    "bootstrap_admin_password_hash",
                    ""));

            assertThatThrownBy(liquibase::afterPropertiesSet)
                    .hasStackTraceContaining("bootstrap super admin parameters are missing or invalid");
        }
    }
}
