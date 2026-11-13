package com.burokent.audit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.burokent.TestcontainersConfiguration;
import com.jayway.jsonpath.JsonPath;
import jakarta.servlet.http.Cookie;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataAccessException;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.postgresql.PostgreSQLContainer;

@SpringBootTest
@AutoConfigureMockMvc
@Import({TestcontainersConfiguration.class, AuditTrailTests.Probe.class})
class AuditTrailTests {

    private static final String ACCESS_COOKIE = "__Host-bk_access";
    private static final String REFRESH_COOKIE = "__Secure-bk_refresh";
    private static final String PASSWORD = "audited-user-password";

    /** Publishes audit entries inside transactions that the test controls. */
    @Component
    static class Probe {

        private final ApplicationEventPublisher events;

        Probe(ApplicationEventPublisher events) {
            this.events = events;
        }

        @NotAudited("test probe")
        @Transactional
        public void publishThenFail(String action) {
            events.publishEvent(AuditEntry.of(action, "probe", "1", "probe"));
            throw new IllegalStateException("business step failed");
        }

        @NotAudited("test probe")
        @Transactional
        public void publish(AuditEntry entry) {
            events.publishEvent(entry);
        }
    }

    @Autowired
    MockMvc mvc;

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    Probe probe;

    @Autowired
    PostgreSQLContainer postgres;

    Cookie superAdmin;

    @BeforeEach
    void logInAsSuperAdmin() throws Exception {
        superAdmin = login(
                        TestcontainersConfiguration.BOOTSTRAP_ADMIN_USERNAME,
                        TestcontainersConfiguration.BOOTSTRAP_ADMIN_PASSWORD,
                        "10.1.0.1")
                .getCookie(ACCESS_COOKIE);
    }

    @Test
    void auditTableIsAppendOnly() {
        JdbcTemplate owner = new JdbcTemplate(new DriverManagerDataSource(
                postgres.getJdbcUrl(),
                TestcontainersConfiguration.OWNER_USER,
                TestcontainersConfiguration.OWNER_PASSWORD));

        assertThat(owner.queryForObject("select obj_description('audit_events'::regclass, 'pg_class')", String.class))
                .isEqualTo("append-only");
        assertThat(jdbc.queryForObject(
                        "select has_table_privilege(current_user, 'audit_events', 'UPDATE')", Boolean.class))
                .isFalse();
        assertThat(jdbc.queryForObject(
                        "select has_table_privilege(current_user, 'audit_events', 'DELETE')", Boolean.class))
                .isFalse();
    }

    @Test
    void rolledBackActionLeavesNoAuditEntry() {
        String action = "probe.rolled_back_" + UUID.randomUUID().toString().substring(0, 8);

        assertThatThrownBy(() -> probe.publishThenFail(action)).isInstanceOf(IllegalStateException.class);

        assertThat(countByAction(action)).isZero();
    }

    @Test
    void failingAuditWriteFailsTheAction() {
        AuditEntry tooLong = AuditEntry.of("probe.invalid", "x".repeat(200), "1", "probe");

        assertThatThrownBy(() -> probe.publish(tooLong)).isInstanceOf(DataAccessException.class);
    }

    @Test
    void identityActionsAreRecordedWithActorAndRequestContext() throws Exception {
        String roleName = "Audited " + UUID.randomUUID();
        long roleId = id(call(post("/api/admin/roles").content(role(roleName, null)), superAdmin)
                .andExpect(status().isCreated()));
        call(
                        put("/api/admin/roles/" + roleId)
                                .header("X-Request-Id", "req-role-update")
                                .content(role(roleName, 0L)),
                        superAdmin)
                .andExpect(status().isOk());
        String username = "audited-" + UUID.randomUUID().toString().substring(0, 8);
        long userId = id(call(post("/api/admin/users").content(newUser(username, roleId)), superAdmin)
                .andExpect(status().isCreated()));
        call(post("/api/admin/users/" + userId + "/sessions/revoke"), superAdmin)
                .andExpect(status().isNoContent());
        assertThat(login(username, "wrong-password-123", "10.1.0.2").getStatus())
                .isEqualTo(401);
        MockHttpServletResponse session = login(username, PASSWORD, "10.1.0.3");
        mvc.perform(post("/api/admin/auth/logout").with(csrf()).cookie(session.getCookie(REFRESH_COOKIE)))
                .andExpect(status().isNoContent());
        call(post("/api/admin/users/" + userId + "/archive"), superAdmin).andExpect(status().isNoContent());

        Map<String, Object> roleUpdate = jdbc.queryForMap(
                "select actor_name, request_id, changes::text as changes from audit_events"
                        + " where action = 'role.updated' and entity_id = ?",
                String.valueOf(roleId));
        assertThat(roleUpdate.get("actor_name")).isEqualTo(TestcontainersConfiguration.BOOTSTRAP_ADMIN_USERNAME);
        assertThat(roleUpdate.get("request_id")).isEqualTo("req-role-update");
        assertThat((String) roleUpdate.get("changes")).contains("\"field\": \"permissions\"", "identity.read");

        assertThat(actionsFor("user", String.valueOf(userId)))
                .containsExactly(
                        "user.created", "user.sessions_ended", "auth.login_succeeded", "auth.logout", "user.archived");
        assertThat(jdbc.queryForObject(
                        "select ip from audit_events where action = 'auth.login_succeeded' and entity_id = ?",
                        String.class,
                        String.valueOf(userId)))
                .isEqualTo("10.1.0.3");
        assertThat(jdbc.queryForObject(
                        "select count(*) from audit_events where action = 'auth.login_failed' and entity_label = ?"
                                + " and actor_user_id is null",
                        Integer.class,
                        username))
                .isOne();
    }

    @Test
    void readingTheLogRequiresAuditRead() throws Exception {
        Cookie noRole = login(createUser(null), PASSWORD, "10.1.0.4").getCookie(ACCESS_COOKIE);
        Cookie manager =
                login(createUser(managerRoleId()), PASSWORD, "10.1.0.5").getCookie(ACCESS_COOKIE);

        call(get("/api/admin/audit-events"), noRole).andExpect(status().isForbidden());
        call(get("/api/admin/audit-events").param("size", "25"), manager)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.page.size").value(25))
                .andExpect(jsonPath("$.page.totalElements").isNumber());
    }

    @Test
    void filtersByEntity() throws Exception {
        String username = createUser(null);
        String userId =
                String.valueOf(jdbc.queryForObject("select id from users where username = ?", Long.class, username));

        call(get("/api/admin/audit-events").param("entityType", "user").param("entityId", userId), superAdmin)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].action").value("user.created"))
                .andExpect(
                        jsonPath("$.content[0].actorName").value(TestcontainersConfiguration.BOOTSTRAP_ADMIN_USERNAME));
    }

    @Test
    void restrictedValuesAreMaskedForReadersWithoutThePermission() throws Exception {
        String entityId = UUID.randomUUID().toString();
        probe.publish(AuditEntry.of("probe.masked", "probe", entityId, "probe")
                .withChanges(List.of(new AuditEntry.Change("secret", "old", "new", "identity.manage"))));
        Cookie manager =
                login(createUser(managerRoleId()), PASSWORD, "10.1.0.6").getCookie(ACCESS_COOKIE);

        call(get("/api/admin/audit-events").param("entityType", "probe").param("entityId", entityId), manager)
                .andExpect(jsonPath("$.content[0].changes[0].masked").value(true))
                .andExpect(jsonPath("$.content[0].changes[0].old").doesNotExist())
                .andExpect(jsonPath("$.content[0].changes[0].new").doesNotExist());
        call(get("/api/admin/audit-events").param("entityType", "probe").param("entityId", entityId), superAdmin)
                .andExpect(jsonPath("$.content[0].changes[0].masked").value(false))
                .andExpect(jsonPath("$.content[0].changes[0].old").value("old"))
                .andExpect(jsonPath("$.content[0].changes[0].new").value("new"));
    }

    private int countByAction(String action) {
        return jdbc.queryForObject("select count(*) from audit_events where action = ?", Integer.class, action);
    }

    private List<String> actionsFor(String entityType, String entityId) {
        return jdbc.queryForList(
                "select action from audit_events where entity_type = ? and entity_id = ? order by id",
                String.class,
                entityType,
                entityId);
    }

    private long managerRoleId() {
        return jdbc.queryForObject("select id from roles where name = 'Yönetici'", Long.class);
    }

    private String createUser(Long roleId) throws Exception {
        String username = "audited-" + UUID.randomUUID().toString().substring(0, 8);
        call(post("/api/admin/users").content(newUser(username, roleId)), superAdmin)
                .andExpect(status().isCreated());
        return username;
    }

    private ResultActions call(MockHttpServletRequestBuilder request, Cookie access) throws Exception {
        return mvc.perform(request.with(csrf()).cookie(access).contentType(MediaType.APPLICATION_JSON));
    }

    private MockHttpServletResponse login(String username, String password, String ip) throws Exception {
        return mvc.perform(post("/api/admin/auth/login")
                        .with(csrf())
                        .with(request -> {
                            request.setRemoteAddr(ip);
                            return request;
                        })
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\": \"%s\", \"password\": \"%s\"}".formatted(username, password)))
                .andReturn()
                .getResponse();
    }

    private static long id(ResultActions result) throws Exception {
        return ((Number) JsonPath.read(result.andReturn().getResponse().getContentAsString(), "$.id")).longValue();
    }

    private static String newUser(String username, Long roleId) {
        return "{\"username\": \"%s\", \"displayName\": \"%s\", \"password\": \"%s\", \"roleId\": %s}"
                .formatted(username, username, PASSWORD, roleId);
    }

    private static String role(String name, Long version) {
        if (version == null) {
            return "{\"name\": \"%s\", \"permissions\": []}".formatted(name);
        }
        return "{\"name\": \"%s\", \"permissions\": [\"identity.read\"], \"version\": %d}".formatted(name, version);
    }
}
