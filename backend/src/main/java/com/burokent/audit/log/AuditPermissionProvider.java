package com.burokent.audit.log;

import com.burokent.audit.AuditPermissions;
import com.burokent.shared.PermissionDefinition;
import com.burokent.shared.PermissionProvider;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
class AuditPermissionProvider implements PermissionProvider {

    @Override
    public List<PermissionDefinition> permissions() {
        return List.of(new PermissionDefinition(AuditPermissions.READ, true));
    }
}
