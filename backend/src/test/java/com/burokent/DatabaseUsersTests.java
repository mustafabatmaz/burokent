package com.burokent;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest
@Import(TestcontainersConfiguration.class)
class DatabaseUsersTests {

    @Autowired
    JdbcTemplate jdbc;

    @Test
    void applicationConnectsAsAppUser() {
        assertThat(jdbc.queryForObject("select current_user", String.class))
                .isEqualTo(TestcontainersConfiguration.APP_USER);
    }

    @Test
    void appUserCannotCreateTables() {
        assertThatThrownBy(() -> jdbc.execute("create table forbidden_probe (id bigint)"))
                .isInstanceOf(DataAccessException.class)
                .rootCause()
                .hasMessageContaining("permission denied for schema public");
    }
}
