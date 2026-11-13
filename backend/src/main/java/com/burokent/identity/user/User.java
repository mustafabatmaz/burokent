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

    private Instant passwordChangedAt;

    private Instant archivedAt;

    private Instant createdAt;

    private Instant updatedAt;

    @Version
    private long version;

    public boolean isArchived() {
        return archivedAt != null;
    }
}
