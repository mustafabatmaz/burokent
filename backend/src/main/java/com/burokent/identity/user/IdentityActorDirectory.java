package com.burokent.identity.user;

import com.burokent.audit.ActorDirectory;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
class IdentityActorDirectory implements ActorDirectory {

    private final UserRepository users;

    @Override
    public Optional<String> displayName(long userId) {
        return users.findById(userId).map(User::getDisplayName);
    }
}
