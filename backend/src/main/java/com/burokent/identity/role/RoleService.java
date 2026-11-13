package com.burokent.identity.role;

import com.burokent.audit.AuditEntry;
import com.burokent.identity.access.AccessService;
import com.burokent.identity.access.PermissionRegistry;
import com.burokent.shared.PermissionDefinition;
import com.burokent.shared.ProblemException;
import java.time.Clock;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.Nullable;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
class RoleService {

    private final RoleRepository roles;
    private final PermissionRegistry registry;
    private final AccessService access;
    private final ApplicationEventPublisher events;
    private final Clock clock;

    @Transactional(readOnly = true)
    List<Role> list() {
        return roles.findAllByOrderByNameAsc();
    }

    @Transactional(readOnly = true)
    Role get(long id) {
        return roles.findById(id).orElseThrow(() -> new ProblemException(HttpStatus.NOT_FOUND, "not_found"));
    }

    @Transactional
    Role create(String name, @Nullable String description, Set<String> permissions) {
        String trimmed = name.trim();
        checkPermissions(permissions);
        if (roles.existsByName(trimmed)) {
            throw new ProblemException(HttpStatus.CONFLICT, "role_name_taken");
        }
        Role role = roles.saveAndFlush(new Role(trimmed, description, permissions, clock.instant()));
        events.publishEvent(entry("role.created", role)
                .withChange("name", null, role.getName())
                .withChange("description", null, role.getDescription())
                .withChange("permissions", null, joined(role.getPermissions())));
        return role;
    }

    @Transactional
    Role update(long id, String name, @Nullable String description, Set<String> permissions, long version) {
        String trimmed = name.trim();
        Role role = roles.findById(id).orElseThrow(() -> new ProblemException(HttpStatus.NOT_FOUND, "not_found"));
        if (role.getVersion() != version) {
            throw new ProblemException(HttpStatus.CONFLICT, "conflict");
        }
        checkPermissions(permissions);
        if (roles.existsByNameAndIdNot(trimmed, id)) {
            throw new ProblemException(HttpStatus.CONFLICT, "role_name_taken");
        }
        AuditEntry entry = entry("role.updated", role)
                .withChange("name", role.getName(), trimmed)
                .withChange("description", role.getDescription(), description)
                .withChange("permissions", joined(role.getPermissions()), joined(permissions));
        role.update(trimmed, description, permissions, clock.instant());
        Role saved = roles.saveAndFlush(role);
        events.publishEvent(entry);
        access.evictAllAfterCommit();
        return saved;
    }

    private static AuditEntry entry(String action, Role role) {
        return AuditEntry.of(action, "role", role.getId().toString(), role.getName());
    }

    private static String joined(Set<String> permissions) {
        return String.join(",", permissions.stream().sorted().toList());
    }

    private void checkPermissions(Set<String> permissions) {
        for (String code : permissions) {
            PermissionDefinition permission = registry.find(code)
                    .orElseThrow(() -> new ProblemException(HttpStatus.BAD_REQUEST, "permission_unknown"));
            if (!permission.delegable()) {
                throw new ProblemException(HttpStatus.BAD_REQUEST, "permission_not_delegable");
            }
        }
    }
}
