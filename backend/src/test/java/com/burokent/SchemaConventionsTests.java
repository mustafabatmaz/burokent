package com.burokent;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * Guards the privilege rules every migration relies on: the app user gets plain CRUD on new tables by default, and
 * tables marked 'append-only' never allow UPDATE or DELETE.
 */
@SpringBootTest
@Import(TestcontainersConfiguration.class)
class SchemaConventionsTests {

    private static final String APPEND_ONLY = "append-only";

    @Autowired
    JdbcTemplate app;

    @Autowired
    PostgreSQLContainer postgres;

    JdbcTemplate owner;

    @BeforeEach
    void connectAsOwner() {
        owner = new JdbcTemplate(new DriverManagerDataSource(
                postgres.getJdbcUrl(),
                TestcontainersConfiguration.OWNER_USER,
                TestcontainersConfiguration.OWNER_PASSWORD));
    }

    @Test
    void appliesSharedChangesetAsOwner() {
        assertThat(owner.queryForObject("select author from databasechangelog where id = 'shared-001'", String.class))
                .isEqualTo("burokent");
    }

    @Test
    void grantsCrudButNothingElseOnNewTables() {
        owner.execute("create table probe_default_grants (id bigint generated always as identity, value text)");
        try {
            assertThat(appPrivileges("probe_default_grants", "SELECT", "INSERT", "UPDATE", "DELETE"))
                    .containsOnly(true);
            assertThat(appPrivileges("probe_default_grants", "TRUNCATE", "REFERENCES", "TRIGGER"))
                    .containsOnly(false);
            assertThat(app.update("insert into probe_default_grants (value) values ('ok')"))
                    .isOne();
        } finally {
            owner.execute("drop table probe_default_grants");
        }
    }

    @Test
    void appendOnlyTableRejectsUpdateAndDelete() {
        owner.execute("create table probe_append_only (id bigint generated always as identity, value text)");
        owner.execute("revoke update, delete on probe_append_only from " + TestcontainersConfiguration.APP_USER);
        owner.execute("comment on table probe_append_only is '" + APPEND_ONLY + "'");
        try {
            assertThat(app.update("insert into probe_append_only (value) values ('ok')"))
                    .isOne();
            assertThatThrownBy(() -> app.update("update probe_append_only set value = 'changed'"))
                    .isInstanceOf(DataAccessException.class)
                    .rootCause()
                    .hasMessageContaining("permission denied");
            assertThatThrownBy(() -> app.update("delete from probe_append_only"))
                    .isInstanceOf(DataAccessException.class)
                    .rootCause()
                    .hasMessageContaining("permission denied");
        } finally {
            owner.execute("drop table probe_append_only");
        }
    }

    @Test
    void everyAppendOnlyTableDeniesUpdateAndDelete() {
        List<String> appendOnlyTables = owner.queryForList("""
                select c.relname from pg_class c
                join pg_namespace n on n.oid = c.relnamespace
                where n.nspname = 'public' and c.relkind = 'r' and obj_description(c.oid, 'pg_class') = ?
                """, String.class, APPEND_ONLY);

        for (String table : appendOnlyTables) {
            assertThat(appPrivileges(table, "UPDATE", "DELETE"))
                    .as("app privileges on append-only table %s", table)
                    .containsOnly(false);
        }
    }

    private List<Boolean> appPrivileges(String table, String... privileges) {
        return List.of(privileges).stream()
                .map(privilege -> app.queryForObject(
                        "select has_table_privilege(current_user, ?, ?)", Boolean.class, table, privilege))
                .toList();
    }
}
