package com.burokent;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
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

    static final String OWNER_USER = "burokent_owner";
    static final String OWNER_PASSWORD = "owner-test-password";
    static final String APP_USER = "burokent_app";
    static final String APP_PASSWORD = "app-test-password";

    @Bean
    PostgreSQLContainer postgresContainer() {
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
    DynamicPropertyRegistrar databaseProperties(PostgreSQLContainer postgres) {
        return registry -> {
            registry.add("spring.datasource.url", postgres::getJdbcUrl);
            registry.add("spring.datasource.username", () -> APP_USER);
            registry.add("spring.datasource.password", () -> APP_PASSWORD);
            registry.add("spring.liquibase.user", () -> OWNER_USER);
            registry.add("spring.liquibase.password", () -> OWNER_PASSWORD);
        };
    }
}
