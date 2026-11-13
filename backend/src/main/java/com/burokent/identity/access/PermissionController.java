package com.burokent.identity.access;

import com.burokent.identity.IdentityPermissions;
import com.burokent.identity.PermissionDefinition;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
class PermissionController {

    private final PermissionRegistry registry;

    @GetMapping("/api/admin/permissions")
    @PreAuthorize("hasAuthority('" + IdentityPermissions.READ + "')")
    List<PermissionDefinition> permissions() {
        return registry.all();
    }
}
