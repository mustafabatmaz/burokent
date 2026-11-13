package com.burokent.identity.user;

import com.burokent.identity.IdentityPermissions;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.Nullable;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
class UserController {

    private static final String MANAGE = "hasAuthority('" + IdentityPermissions.MANAGE + "')";

    private final UserManagementService users;

    record UserView(
            long id,
            String username,
            String displayName,
            boolean superAdmin,
            @Nullable Long roleId,
            boolean archived,
            long version) {

        static UserView of(User user) {
            return new UserView(
                    user.getId(),
                    user.getUsername(),
                    user.getDisplayName(),
                    user.isSuperAdmin(),
                    user.getRoleId(),
                    user.isArchived(),
                    user.getVersion());
        }
    }

    record CreateUserRequest(
            @NotBlank String username,
            @NotBlank @Size(max = 128) String displayName,
            @NotBlank String password,
            @Nullable Long roleId) {}

    record UpdateUserRequest(
            @NotBlank @Size(max = 128) String displayName,
            @Nullable Long roleId,
            long version) {}

    record ResetPasswordRequest(@NotBlank String password) {}

    @GetMapping
    @PreAuthorize("hasAuthority('" + IdentityPermissions.READ + "')")
    List<UserView> list() {
        return users.list().stream().map(UserView::of).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize(MANAGE)
    UserView create(@Valid @RequestBody CreateUserRequest request) {
        return UserView.of(
                users.create(request.username(), request.displayName(), request.password(), request.roleId()));
    }

    @PutMapping("/{id}")
    @PreAuthorize(MANAGE)
    UserView update(@PathVariable long id, @Valid @RequestBody UpdateUserRequest request) {
        return UserView.of(users.update(id, request.displayName(), request.roleId(), request.version()));
    }

    @PostMapping("/{id}/password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize(MANAGE)
    void resetPassword(@PathVariable long id, @Valid @RequestBody ResetPasswordRequest request) {
        users.resetPassword(id, request.password());
    }

    @PostMapping("/{id}/archive")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize(MANAGE)
    void archive(@PathVariable long id) {
        users.archive(id);
    }

    @PostMapping("/{id}/unarchive")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize(MANAGE)
    void unarchive(@PathVariable long id) {
        users.unarchive(id);
    }

    @PostMapping("/{id}/sessions/revoke")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize(MANAGE)
    void endSessions(@PathVariable long id) {
        users.endSessions(id);
    }
}
