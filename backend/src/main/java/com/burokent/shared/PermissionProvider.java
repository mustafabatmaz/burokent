package com.burokent.shared;

import java.util.List;

/**
 * Implemented by each module (as a bean) to declare its permissions. Every permission also needs a changeset that
 * inserts it into the {@code permissions} table; a test keeps both in sync.
 */
public interface PermissionProvider {

    List<PermissionDefinition> permissions();
}
