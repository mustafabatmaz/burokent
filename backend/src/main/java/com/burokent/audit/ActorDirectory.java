package com.burokent.audit;

import java.util.Optional;

/** Looks up the display name of a user, stored as a snapshot with each audit entry. */
public interface ActorDirectory {

    Optional<String> displayName(long userId);
}
