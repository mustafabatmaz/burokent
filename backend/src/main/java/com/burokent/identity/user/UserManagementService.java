package com.burokent.identity.user;

import com.burokent.identity.access.AccessService;
import com.burokent.identity.auth.SessionService;
import com.burokent.identity.role.RoleRepository;
import com.burokent.shared.ProblemException;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.Nullable;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
class UserManagementService {

    private static final Pattern USERNAME = Pattern.compile("[a-z0-9._-]{3,64}");

    private final UserRepository users;
    private final RoleRepository roles;
    private final PasswordEncoder passwordEncoder;
    private final SessionService sessions;
    private final AccessService access;
    private final Clock clock;

    @Transactional(readOnly = true)
    List<User> list() {
        return users.findAllByOrderByUsernameAsc();
    }

    @Transactional
    User create(String rawUsername, String displayName, String password, @Nullable Long roleId) {
        String username = rawUsername.trim().toLowerCase(Locale.ROOT);
        if (!USERNAME.matcher(username).matches()) {
            throw ProblemException.fieldError("username", "pattern");
        }
        PasswordPolicy.check("password", password);
        checkRole(roleId);
        if (users.existsByUsername(username)) {
            throw new ProblemException(HttpStatus.CONFLICT, "username_taken");
        }
        return users.saveAndFlush(
                new User(username, displayName.trim(), passwordEncoder.encode(password), roleId, clock.instant()));
    }

    @Transactional
    User update(long id, String displayName, @Nullable Long roleId, long version) {
        User user = modifiable(id);
        if (user.getVersion() != version) {
            throw new ProblemException(HttpStatus.CONFLICT, "conflict");
        }
        checkRole(roleId);
        user.update(displayName.trim(), roleId, clock.instant());
        return saved(user);
    }

    /** Sets a new password and ends all sessions of the user. */
    @Transactional
    void resetPassword(long id, String password) {
        PasswordPolicy.check("password", password);
        User user = modifiable(id);
        Instant now = clock.instant();
        user.changePassword(passwordEncoder.encode(password), now);
        user.endSessions(now);
        sessions.revokeAll(id);
        saved(user);
    }

    @Transactional
    void archive(long id) {
        User user = modifiable(id);
        user.archive(clock.instant());
        sessions.revokeAll(id);
        saved(user);
    }

    @Transactional
    void unarchive(long id) {
        User user = modifiable(id);
        user.unarchive(clock.instant());
        saved(user);
    }

    @Transactional
    void endSessions(long id) {
        User user = modifiable(id);
        user.endSessions(clock.instant());
        sessions.revokeAll(id);
        saved(user);
    }

    /** The user's own password change; keeps the current sessions. */
    @Transactional
    void changeOwnPassword(long id, String currentPassword, String newPassword) {
        User user = users.findById(id).orElseThrow(() -> new ProblemException(HttpStatus.NOT_FOUND, "not_found"));
        if (!passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            throw ProblemException.fieldError("currentPassword", "invalid");
        }
        PasswordPolicy.check("newPassword", newPassword);
        user.changePassword(passwordEncoder.encode(newPassword), clock.instant());
        users.saveAndFlush(user);
    }

    private User modifiable(long id) {
        User user = users.findById(id).orElseThrow(() -> new ProblemException(HttpStatus.NOT_FOUND, "not_found"));
        if (user.isSuperAdmin()) {
            throw new ProblemException(HttpStatus.FORBIDDEN, "super_admin_immutable");
        }
        return user;
    }

    private User saved(User user) {
        User saved = users.saveAndFlush(user);
        access.evictAfterCommit(user.getId());
        return saved;
    }

    private void checkRole(@Nullable Long roleId) {
        if (roleId != null && !roles.existsById(roleId)) {
            throw ProblemException.fieldError("roleId", "role_unknown");
        }
    }
}
