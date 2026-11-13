package com.burokent.identity.access;

import com.burokent.identity.IdentityPermissions;
import com.burokent.shared.PermissionDefinition;
import com.burokent.shared.PermissionProvider;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
class IdentityPermissionProvider implements PermissionProvider {

    @Override
    public List<PermissionDefinition> permissions() {
        return List.of(
                new PermissionDefinition(IdentityPermissions.MANAGE, false),
                new PermissionDefinition(IdentityPermissions.READ, true));
    }
}
