package com.burokent.identity.user;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.jspecify.annotations.Nullable;

@Entity
@Table(name = "users")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String username;

    private String displayName;

    private String passwordHash;

    private boolean superAdmin;

    private @Nullable Long roleId;

    /** Increased to end all sessions: access tokens carry the version they were issued with. */
    private int sessionVersion;

    private Instant passwordChangedAt;

    private @Nullable Instant archivedAt;

    private Instant createdAt;

    private Instant updatedAt;

    @Version
    private long version;

    User(String username, String displayName, String passwordHash, @Nullable Long roleId, Instant now) {
        this.username = username;
        this.displayName = displayName;
        this.passwordHash = passwordHash;
        this.roleId = roleId;
        this.passwordChangedAt = now;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public boolean isArchived() {
        return archivedAt != null;
    }

    void update(String displayName, @Nullable Long roleId, Instant now) {
        this.displayName = displayName;
        this.roleId = roleId;
        this.updatedAt = now;
    }

    void changePassword(String passwordHash, Instant now) {
        this.passwordHash = passwordHash;
        this.passwordChangedAt = now;
        this.updatedAt = now;
    }

    void endSessions(Instant now) {
        this.sessionVersion++;
        this.updatedAt = now;
    }

    void archive(Instant now) {
        this.archivedAt = now;
        endSessions(now);
    }

    void unarchive(Instant now) {
        this.archivedAt = null;
        this.updatedAt = now;
    }
}
