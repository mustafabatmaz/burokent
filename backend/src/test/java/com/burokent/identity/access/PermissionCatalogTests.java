package com.burokent.identity.access;

import static org.assertj.core.api.Assertions.assertThat;

import com.burokent.TestcontainersConfiguration;
import com.burokent.shared.PermissionDefinition;
import java.util.Map;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest
@Import(TestcontainersConfiguration.class)
class PermissionCatalogTests {

    @Autowired
    PermissionRegistry registry;

    @Autowired
    JdbcTemplate jdbc;

    @Test
    void permissionsInCodeMatchPermissionsTable() {
        Map<String, Boolean> inCode = registry.all().stream()
                .collect(Collectors.toMap(PermissionDefinition::code, PermissionDefinition::delegable));
        Map<String, Boolean> inDatabase = jdbc.query("select code, delegable from permissions", rs -> {
            Map<String, Boolean> rows = new java.util.HashMap<>();
            while (rs.next()) {
                rows.put(rs.getString("code"), rs.getBoolean("delegable"));
            }
            return rows;
        });

        assertThat(inDatabase).isEqualTo(inCode);
    }
}
