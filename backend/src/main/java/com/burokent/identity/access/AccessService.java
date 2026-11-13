package com.burokent.identity.access;

import com.burokent.identity.role.Role;
import com.burokent.identity.role.RoleRepository;
import com.burokent.identity.user.User;
import com.burokent.identity.user.UserRepository;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * Resolves the effective permissions of a user. Results are cached for a short time and evicted as soon as a change
 * to users or roles commits, so a revoked permission stops working on the next request.
 */
@Service
@RequiredArgsConstructor
public class AccessService {

    private static final Duration CACHE_TTL = Duration.ofSeconds(60);

    private record CachedAccess(Optional<UserAccess> access, Instant loadedAt) {}

    private final UserRepository users;
    private final RoleRepository roles;
    private final PermissionRegistry registry;
    private final Clock clock;
    private final Map<Long, CachedAccess> cache = new ConcurrentHashMap<>();

    /** Empty when the user does not exist or is archived. */
    @Transactional(readOnly = true)
    public Optional<UserAccess> find(long userId) {
        Instant now = clock.instant();
        CachedAccess cached = cache.get(userId);
        if (cached != null && cached.loadedAt().plus(CACHE_TTL).isAfter(now)) {
            return cached.access();
        }
        Optional<UserAccess> access =
                users.findById(userId).filter(user -> !user.isArchived()).map(this::toAccess);
        cache.put(userId, new CachedAccess(access, now));
        return access;
    }

    public void evictAfterCommit(long userId) {
        afterCommit(() -> cache.remove(userId));
    }

    public void evictAllAfterCommit() {
        afterCommit(cache::clear);
    }

    private UserAccess toAccess(User user) {
        Set<String> permissions;
        if (user.isSuperAdmin()) {
            permissions = registry.codes();
        } else if (user.getRoleId() == null) {
            permissions = Set.of();
        } else {
            permissions = roles.findById(user.getRoleId())
                    .map(Role::getPermissions)
                    .map(Set::copyOf)
                    .orElse(Set.of());
        }
        return new UserAccess(user.getId(), user.getSessionVersion(), permissions);
    }

    private static void afterCommit(Runnable action) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            action.run();
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                action.run();
            }
        });
    }
}
