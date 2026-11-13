package com.burokent.identity.auth;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.jspecify.annotations.Nullable;

/** One refresh token of a login session ("family"); only its SHA-256 hash is stored. */
@Entity
@Table(name = "refresh_tokens")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class RefreshToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long userId;

    private String tokenHash;

    private UUID familyId;

    private Instant createdAt;

    private Instant expiresAt;

    private @Nullable Instant revokedAt;

    private @Nullable String userAgent;

    private @Nullable String ip;

    RefreshToken(
            Long userId,
            String tokenHash,
            UUID familyId,
            Instant createdAt,
            Instant expiresAt,
            @Nullable String userAgent,
            @Nullable String ip) {
        this.userId = userId;
        this.tokenHash = tokenHash;
        this.familyId = familyId;
        this.createdAt = createdAt;
        this.expiresAt = expiresAt;
        this.userAgent = userAgent;
        this.ip = ip;
    }

    boolean isRevoked() {
        return revokedAt != null;
    }

    boolean isExpired(Instant now) {
        return !expiresAt.isAfter(now);
    }

    void revoke(Instant now) {
        revokedAt = now;
    }
}
