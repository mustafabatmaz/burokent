package com.burokent.media.library;

import com.burokent.media.MediaPermissions;
import com.burokent.shared.PermissionDefinition;
import com.burokent.shared.PermissionProvider;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
class MediaPermissionProvider implements PermissionProvider {

    @Override
    public List<PermissionDefinition> permissions() {
        return List.of(
                new PermissionDefinition(MediaPermissions.READ, true),
                new PermissionDefinition(MediaPermissions.MANAGE, true));
    }
}
