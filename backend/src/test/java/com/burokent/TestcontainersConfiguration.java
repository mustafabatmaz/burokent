package com.burokent;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.test.context.DynamicPropertyRegistrar;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;
import org.testcontainers.utility.MountableFile;

/**
 * Starts PostgreSQL with the same init script as the compose files, so tests run with the real owner/app user split:
 * Liquibase connects as the schema owner, the application as the restricted app user.
 */
@TestConfiguration(proxyBeanMethods = false)
public class TestcontainersConfiguration {

    public static final String OWNER_USER = "burokent_owner";
    public static final String OWNER_PASSWORD = "owner-test-password";
    public static final String APP_USER = "burokent_app";
    public static final String APP_PASSWORD = "app-test-password";

    public static final String BOOTSTRAP_ADMIN_USERNAME = "bootstrap-admin";
    public static final String BOOTSTRAP_ADMIN_PASSWORD = "bootstrap-admin-password";
    static final String BOOTSTRAP_ADMIN_PASSWORD_HASH =
            PasswordEncoderFactories.createDelegatingPasswordEncoder().encode(BOOTSTRAP_ADMIN_PASSWORD);

    // 256-bit test-only key, base64
    static final String JWT_SECRET = "dGVzdC1vbmx5LWp3dC1zZWNyZXQta2V5LTMyLWJ5dGVzLWxvbmch";

    public static PostgreSQLContainer newPostgres() {
        return new PostgreSQLContainer(DockerImageName.parse("postgres:18-alpine"))
                .withDatabaseName("burokent")
                .withEnv("DB_OWNER_USER", OWNER_USER)
                .withEnv("DB_OWNER_PASSWORD", OWNER_PASSWORD)
                .withEnv("DB_APP_USER", APP_USER)
                .withEnv("DB_APP_PASSWORD", APP_PASSWORD)
                .withCopyFileToContainer(
                        MountableFile.forHostPath("../infra/postgres/init/01-users.sh", 0755),
                        "/docker-entrypoint-initdb.d/01-users.sh");
    }

    @Bean
    PostgreSQLContainer postgresContainer() {
        return newPostgres();
    }

    @Bean
    DynamicPropertyRegistrar databaseProperties(PostgreSQLContainer postgres) throws IOException {
        Path mediaRoot = Files.createTempDirectory("burokent-media-test");
        return registry -> {
            registry.add("spring.datasource.url", postgres::getJdbcUrl);
            registry.add("spring.datasource.username", () -> APP_USER);
            registry.add("spring.datasource.password", () -> APP_PASSWORD);
            registry.add("spring.liquibase.user", () -> OWNER_USER);
            registry.add("spring.liquibase.password", () -> OWNER_PASSWORD);
            registry.add("spring.liquibase.parameters.bootstrap_admin_username", () -> BOOTSTRAP_ADMIN_USERNAME);
            registry.add(
                    "spring.liquibase.parameters.bootstrap_admin_password_hash", () -> BOOTSTRAP_ADMIN_PASSWORD_HASH);
            registry.add("burokent.auth.jwt-secret", () -> JWT_SECRET);
            registry.add("burokent.media.root", () -> mediaRoot.toString());
        };
    }
}
