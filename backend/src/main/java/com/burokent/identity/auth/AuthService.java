package com.burokent.identity.auth;

import com.burokent.audit.AuditEntry;
import com.burokent.identity.auth.AuthExceptions.InvalidCredentialsException;
import com.burokent.identity.auth.AuthExceptions.InvalidSessionException;
import com.burokent.identity.auth.AuthExceptions.TooManyAttemptsException;
import com.burokent.identity.user.User;
import com.burokent.identity.user.UserRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;
import org.jspecify.annotations.Nullable;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class AuthService {

    private static final int REFRESH_TOKEN_BYTES = 32;
    private static final int USER_AGENT_MAX_LENGTH = 512;

    private final UserRepository users;
    private final RefreshTokenRepository refreshTokens;
    private final AccessTokenIssuer accessTokens;
    private final LoginAttemptLimiter limiter;
    private final PasswordEncoder passwordEncoder;
    private final AuthProperties properties;
    private final Clock clock;
    private final ApplicationEventPublisher events;
    private final SecureRandom random = new SecureRandom();
    // Compared against when the user does not exist, so both cases take the same time
    private final String dummyPasswordHash;

    AuthService(
            UserRepository users,
            RefreshTokenRepository refreshTokens,
            AccessTokenIssuer accessTokens,
            LoginAttemptLimiter limiter,
            PasswordEncoder passwordEncoder,
            AuthProperties properties,
            Clock clock,
            ApplicationEventPublisher events) {
        this.users = users;
        this.refreshTokens = refreshTokens;
        this.accessTokens = accessTokens;
        this.limiter = limiter;
        this.passwordEncoder = passwordEncoder;
        this.properties = properties;
        this.clock = clock;
        this.events = events;
        this.dummyPasswordHash = passwordEncoder.encode(UUID.randomUUID().toString());
    }

    record Session(String accessToken, Duration accessTokenMaxAge, String refreshToken, Duration refreshTokenMaxAge) {}

    // Not rolled back on failure, so the failed attempt stays in the activity log
    @Transactional(noRollbackFor = InvalidCredentialsException.class)
    Session login(String rawUsername, String password, String ip, @Nullable String userAgent) {
        String username = rawUsername.trim().toLowerCase(Locale.ROOT);
        limiter.blockedFor(username, ip).ifPresent(wait -> {
            throw new TooManyAttemptsException(wait);
        });

        Optional<User> user = users.findByUsername(username).filter(candidate -> !candidate.isArchived());
        boolean matches = passwordEncoder.matches(
                password, user.map(User::getPasswordHash).orElse(dummyPasswordHash));
        if (user.isEmpty() || !matches) {
            limiter.recordFailure(username, ip);
            events.publishEvent(AuditEntry.of("auth.login_failed", "user", null, username));
            throw new InvalidCredentialsException();
        }

        limiter.recordSuccess(username, ip);
        events.publishEvent(
                userEntry("auth.login_succeeded", user.get()).byActor(user.get().getId()));
        Instant now = clock.instant();
        return startSession(user.get(), UUID.randomUUID(), now.plus(properties.refreshTokenTtl()), ip, userAgent);
    }

    @Transactional(noRollbackFor = InvalidSessionException.class)
    Session refresh(@Nullable String rawRefreshToken, String ip, @Nullable String userAgent) {
        Instant now = clock.instant();
        RefreshToken current = findToken(rawRefreshToken).orElseThrow(InvalidSessionException::new);
        if (current.isRevoked()) {
            // A rotated token came back: assume it was stolen and end the whole session
            refreshTokens.revokeFamily(current.getFamilyId(), now);
            events.publishEvent(AuditEntry.of(
                            "auth.refresh_token_reused",
                            "user",
                            current.getUserId().toString(),
                            null)
                    .byActor(current.getUserId()));
            throw new InvalidSessionException();
        }
        Optional<User> user = users.findById(current.getUserId()).filter(candidate -> !candidate.isArchived());
        if (current.isExpired(now) || user.isEmpty()) {
            throw new InvalidSessionException();
        }

        current.revoke(now);
        return startSession(user.get(), current.getFamilyId(), current.getExpiresAt(), ip, userAgent);
    }

    @Transactional
    void logout(@Nullable String rawRefreshToken) {
        Optional<RefreshToken> token = findToken(rawRefreshToken);
        if (token.isEmpty()) {
            return;
        }
        refreshTokens.revokeFamily(token.get().getFamilyId(), clock.instant());
        Optional<User> user = users.findById(token.get().getUserId());
        if (user.isPresent()) {
            events.publishEvent(
                    userEntry("auth.logout", user.get()).byActor(user.get().getId()));
        }
    }

    private static AuditEntry userEntry(String action, User user) {
        return AuditEntry.of(action, "user", user.getId().toString(), user.getUsername());
    }

    private Session startSession(User user, UUID familyId, Instant expiresAt, String ip, @Nullable String userAgent) {
        Instant now = clock.instant();
        String rawRefreshToken = newRefreshToken();
        refreshTokens.save(new RefreshToken(
                user.getId(), hash(rawRefreshToken), familyId, now, expiresAt, truncate(userAgent), ip));
        return new Session(
                accessTokens.issue(user.getId(), user.getSessionVersion()),
                properties.accessTokenTtl(),
                rawRefreshToken,
                Duration.between(now, expiresAt));
    }

    private Optional<RefreshToken> findToken(@Nullable String rawRefreshToken) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            return Optional.empty();
        }
        return refreshTokens.findByTokenHash(hash(rawRefreshToken));
    }

    private String newRefreshToken() {
        byte[] bytes = new byte[REFRESH_TOKEN_BYTES];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static String hash(String rawToken) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    private static @Nullable String truncate(@Nullable String userAgent) {
        if (userAgent == null || userAgent.length() <= USER_AGENT_MAX_LENGTH) {
            return userAgent;
        }
        return userAgent.substring(0, USER_AGENT_MAX_LENGTH);
    }
}
