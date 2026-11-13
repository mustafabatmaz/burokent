package com.burokent.identity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.burokent.TestcontainersConfiguration;
import com.burokent.audit.AuditPermissions;
import com.jayway.jsonpath.JsonPath;
import jakarta.servlet.http.Cookie;
import java.util.UUID;
import org.jspecify.annotations.Nullable;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class IdentityManagementTests {

    private static final String ACCESS_COOKIE = "__Host-bk_access";
    private static final String REFRESH_COOKIE = "__Secure-bk_refresh";
    private static final String PASSWORD = "managed-user-password";

    @Autowired
    MockMvc mvc;

    @Autowired
    JdbcTemplate jdbc;

    Cookie superAdmin;

    @BeforeEach
    void logInAsSuperAdmin() throws Exception {
        superAdmin = login(
                        TestcontainersConfiguration.BOOTSTRAP_ADMIN_USERNAME,
                        TestcontainersConfiguration.BOOTSTRAP_ADMIN_PASSWORD)
                .getCookie(ACCESS_COOKIE);
    }

    @Test
    void userWithoutRoleHasNoPermissions() throws Exception {
        String username = createUser(null);
        Cookie access = login(username, PASSWORD).getCookie(ACCESS_COOKIE);

        call(get("/api/admin/users"), access)
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("forbidden"));
        call(get("/api/admin/me"), access).andExpect(jsonPath("$.permissions").isEmpty());
    }

    @Test
    void nonDelegableOrUnknownPermissionCannotBeGrantedToARole() throws Exception {
        call(
                        post("/api/admin/roles").content(role("Role " + UUID.randomUUID(), IdentityPermissions.MANAGE)),
                        superAdmin)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("permission_not_delegable"));
        call(post("/api/admin/roles").content(role("Role " + UUID.randomUUID(), "unknown.permission")), superAdmin)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("permission_unknown"));
    }

    @Test
    void grantedAndRevokedPermissionsApplyToTheNextRequest() throws Exception {
        String roleName = "Role " + UUID.randomUUID();
        long roleId = id(call(post("/api/admin/roles").content(role(roleName)), superAdmin)
                .andExpect(status().isCreated()));
        Cookie access = login(createUser(roleId), PASSWORD).getCookie(ACCESS_COOKIE);

        call(get("/api/admin/users"), access).andExpect(status().isForbidden());

        call(put("/api/admin/roles/" + roleId).content(role(roleName, 0, IdentityPermissions.READ)), superAdmin)
                .andExpect(status().isOk());
        call(get("/api/admin/users"), access).andExpect(status().isOk());

        call(put("/api/admin/roles/" + roleId).content(role(roleName, 1)), superAdmin)
                .andExpect(status().isOk());
        call(get("/api/admin/users"), access).andExpect(status().isForbidden());
    }

    @Test
    void archivingEndsTheUsersSessionsImmediately() throws Exception {
        String username = createUser(null);
        long userId = userId(username);
        MockHttpServletResponse session = login(username, PASSWORD);

        call(post("/api/admin/users/" + userId + "/archive"), superAdmin).andExpect(status().isNoContent());

        call(get("/api/admin/me"), session.getCookie(ACCESS_COOKIE)).andExpect(status().isUnauthorized());
        assertThat(refresh(session.getCookie(REFRESH_COOKIE)).getStatus()).isEqualTo(401);
        assertThat(login(username, PASSWORD).getStatus()).isEqualTo(401);

        call(post("/api/admin/users/" + userId + "/unarchive"), superAdmin).andExpect(status().isNoContent());
        assertThat(login(username, PASSWORD).getStatus()).isEqualTo(204);
    }

    @Test
    void revokingSessionsLogsTheUserOutEverywhere() throws Exception {
        String username = createUser(null);
        MockHttpServletResponse session = login(username, PASSWORD);

        call(post("/api/admin/users/" + userId(username) + "/sessions/revoke"), superAdmin)
                .andExpect(status().isNoContent());

        call(get("/api/admin/me"), session.getCookie(ACCESS_COOKIE)).andExpect(status().isUnauthorized());
        assertThat(refresh(session.getCookie(REFRESH_COOKIE)).getStatus()).isEqualTo(401);

        Cookie newAccess = login(username, PASSWORD).getCookie(ACCESS_COOKIE);
        call(get("/api/admin/me"), newAccess).andExpect(status().isOk());
    }

    @Test
    void superAdminCannotBeChangedThroughTheApi() throws Exception {
        long superAdminId = userId(TestcontainersConfiguration.BOOTSTRAP_ADMIN_USERNAME);

        call(put("/api/admin/users/" + superAdminId).content("{\"displayName\": \"x\", \"version\": 0}"), superAdmin)
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("super_admin_immutable"));
        call(post("/api/admin/users/" + superAdminId + "/archive"), superAdmin)
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("super_admin_immutable"));
    }

    @Test
    void passwordResetEnforcesThePolicyAndEndsOldSessions() throws Exception {
        String username = createUser(null);
        long userId = userId(username);
        Cookie oldAccess = login(username, PASSWORD).getCookie(ACCESS_COOKIE);

        call(post("/api/admin/users/" + userId + "/password").content("{\"password\": \"short\"}"), superAdmin)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("password"))
                .andExpect(jsonPath("$.errors[0].code").value("password_too_short"));
        call(
                        post("/api/admin/users/" + userId + "/password")
                                .content("{\"password\": \"a-brand-new-password\"}"),
                        superAdmin)
                .andExpect(status().isNoContent());

        call(get("/api/admin/me"), oldAccess).andExpect(status().isUnauthorized());
        assertThat(login(username, PASSWORD).getStatus()).isEqualTo(401);
        assertThat(login(username, "a-brand-new-password").getStatus()).isEqualTo(204);
    }

    @Test
    void changingOwnPasswordRequiresTheCurrentOne() throws Exception {
        String username = createUser(null);
        Cookie access = login(username, PASSWORD).getCookie(ACCESS_COOKIE);

        call(post("/api/admin/me/password").content(ownPassword("wrong-current-password", "my-new-password-1")), access)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("currentPassword"));
        call(post("/api/admin/me/password").content(ownPassword(PASSWORD, "my-new-password-1")), access)
                .andExpect(status().isNoContent());

        assertThat(login(username, "my-new-password-1").getStatus()).isEqualTo(204);
        call(get("/api/admin/me"), access).andExpect(status().isOk());
    }

    @Test
    void staleVersionIsRejected() throws Exception {
        String username = createUser(null);
        long userId = userId(username);

        call(put("/api/admin/users/" + userId).content("{\"displayName\": \"First\", \"version\": 0}"), superAdmin)
                .andExpect(status().isOk());
        call(put("/api/admin/users/" + userId).content("{\"displayName\": \"Second\", \"version\": 0}"), superAdmin)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("conflict"));
    }

    @Test
    void usernamesAreUniqueIgnoringCase() throws Exception {
        String username = createUser(null);

        call(post("/api/admin/users").content(newUser(username.toUpperCase(), null)), superAdmin)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("username_taken"));
    }

    @Test
    void meListsTheEffectivePermissions() throws Exception {
        Long managerRoleId = jdbc.queryForObject("select id from roles where name = 'Yönetici'", Long.class);
        Cookie manager = login(createUser(managerRoleId), PASSWORD).getCookie(ACCESS_COOKIE);

        call(get("/api/admin/me"), manager)
                .andExpect(jsonPath("$.permissions")
                        .value(org.hamcrest.Matchers.containsInAnyOrder(
                                AuditPermissions.READ, IdentityPermissions.READ)));
        call(get("/api/admin/me"), superAdmin)
                .andExpect(jsonPath("$.permissions")
                        .value(org.hamcrest.Matchers.containsInAnyOrder(
                                AuditPermissions.READ, IdentityPermissions.MANAGE, IdentityPermissions.READ)));
    }

    private String createUser(@Nullable Long roleId) throws Exception {
        String username = "user-" + UUID.randomUUID().toString().substring(0, 8);
        call(post("/api/admin/users").content(newUser(username, roleId)), superAdmin)
                .andExpect(status().isCreated());
        return username;
    }

    private long userId(String username) {
        return jdbc.queryForObject("select id from users where username = ?", Long.class, username);
    }

    private ResultActions call(MockHttpServletRequestBuilder request, Cookie access) throws Exception {
        return mvc.perform(request.with(csrf()).cookie(access).contentType(MediaType.APPLICATION_JSON));
    }

    private MockHttpServletResponse login(String username, String password) throws Exception {
        return mvc.perform(post("/api/admin/auth/login")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\": \"%s\", \"password\": \"%s\"}".formatted(username, password)))
                .andReturn()
                .getResponse();
    }

    private MockHttpServletResponse refresh(Cookie refreshCookie) throws Exception {
        return mvc.perform(post("/api/admin/auth/refresh").with(csrf()).cookie(refreshCookie))
                .andReturn()
                .getResponse();
    }

    private static long id(ResultActions result) throws Exception {
        return ((Number) JsonPath.read(result.andReturn().getResponse().getContentAsString(), "$.id")).longValue();
    }

    private static String newUser(String username, @Nullable Long roleId) {
        return "{\"username\": \"%s\", \"displayName\": \"%s\", \"password\": \"%s\", \"roleId\": %s}"
                .formatted(username, username, PASSWORD, roleId);
    }

    private static String role(String name, String... permissions) {
        return "{\"name\": \"%s\", \"permissions\": %s}".formatted(name, jsonArray(permissions));
    }

    private static String role(String name, long version, String... permissions) {
        return "{\"name\": \"%s\", \"permissions\": %s, \"version\": %d}"
                .formatted(name, jsonArray(permissions), version);
    }

    private static String ownPassword(String current, String next) {
        return "{\"currentPassword\": \"%s\", \"newPassword\": \"%s\"}".formatted(current, next);
    }

    private static String jsonArray(String... values) {
        return java.util.Arrays.stream(values)
                .map(value -> "\"" + value + "\"")
                .collect(java.util.stream.Collectors.joining(",", "[", "]"));
    }
}
