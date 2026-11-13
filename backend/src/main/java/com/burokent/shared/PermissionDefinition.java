package com.burokent.shared;

/**
 * One permission of the admin panel, written as {@code module.action}. Non-delegable permissions can never be granted
 * to a role; only the super admin holds them.
 */
public record PermissionDefinition(String code, boolean delegable) {}
