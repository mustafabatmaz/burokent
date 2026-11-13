package com.burokent.identity.role;

import com.burokent.identity.PermissionDefinition;
import com.burokent.identity.access.AccessService;
import com.burokent.identity.access.PermissionRegistry;
import com.burokent.shared.ProblemException;
import java.time.Clock;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.Nullable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
class RoleService {

    private final RoleRepository roles;
    private final PermissionRegistry registry;
    private final AccessService access;
    private final Clock clock;

    @Transactional(readOnly = true)
    List<Role> list() {
        return roles.findAllByOrderByNameAsc();
    }

    @Transactional
    Role create(String name, @Nullable String description, Set<String> permissions) {
        String trimmed = name.trim();
        checkPermissions(permissions);
        if (roles.existsByName(trimmed)) {
            throw new ProblemException(HttpStatus.CONFLICT, "role_name_taken");
        }
        return roles.saveAndFlush(new Role(trimmed, description, permissions, clock.instant()));
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
        role.update(trimmed, description, permissions, clock.instant());
        Role saved = roles.saveAndFlush(role);
        access.evictAllAfterCommit();
        return saved;
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
