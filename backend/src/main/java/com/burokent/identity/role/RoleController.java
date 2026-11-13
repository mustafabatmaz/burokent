package com.burokent.identity.role;

import com.burokent.identity.IdentityPermissions;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.Set;
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
@RequestMapping("/api/admin/roles")
@RequiredArgsConstructor
class RoleController {

    private final RoleService roles;

    record RoleView(long id, String name, @Nullable String description, List<String> permissions, long version) {

        static RoleView of(Role role) {
            return new RoleView(
                    role.getId(),
                    role.getName(),
                    role.getDescription(),
                    role.getPermissions().stream().sorted().toList(),
                    role.getVersion());
        }
    }

    record CreateRoleRequest(
            @NotBlank @Size(max = 64) String name,
            @Nullable @Size(max = 255) String description,
            @NotNull Set<String> permissions) {}

    record UpdateRoleRequest(
            @NotBlank @Size(max = 64) String name,
            @Nullable @Size(max = 255) String description,
            @NotNull Set<String> permissions,
            long version) {}

    @GetMapping
    @PreAuthorize("hasAuthority('" + IdentityPermissions.READ + "')")
    List<RoleView> list() {
        return roles.list().stream().map(RoleView::of).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('" + IdentityPermissions.MANAGE + "')")
    RoleView create(@Valid @RequestBody CreateRoleRequest request) {
        return RoleView.of(roles.create(request.name(), request.description(), request.permissions()));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('" + IdentityPermissions.MANAGE + "')")
    RoleView update(@PathVariable long id, @Valid @RequestBody UpdateRoleRequest request) {
        return RoleView.of(
                roles.update(id, request.name(), request.description(), request.permissions(), request.version()));
    }
}
