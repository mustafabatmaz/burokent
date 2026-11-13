package com.burokent.identity.access;

import java.util.Set;

/** What a logged-in user may do right now; loaded per request and cached briefly. */
public record UserAccess(long userId, int sessionVersion, Set<String> permissions) {}
