package com.burokent.identity;

/** Permissions of the identity module. */
public final class IdentityPermissions {

    /** Create, edit and archive users, reset passwords, end sessions, manage roles. Super admin only. */
    public static final String MANAGE = "identity.manage";

    /** See users, roles and permissions. */
    public static final String READ = "identity.read";

    private IdentityPermissions() {}
}
