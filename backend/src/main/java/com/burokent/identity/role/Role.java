package com.burokent.identity.role;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.HashSet;
import java.util.Set;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.jspecify.annotations.Nullable;

@Entity
@Table(name = "roles")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Role {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    private @Nullable String description;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "role_permissions", joinColumns = @JoinColumn(name = "role_id"))
    @Column(name = "permission_code")
    private Set<String> permissions = new HashSet<>();

    private Instant createdAt;

    private Instant updatedAt;

    @Version
    private long version;

    Role(String name, @Nullable String description, Set<String> permissions, Instant now) {
        this.name = name;
        this.description = description;
        this.permissions = new HashSet<>(permissions);
        this.createdAt = now;
        this.updatedAt = now;
    }

    void update(String name, @Nullable String description, Set<String> permissions, Instant now) {
        this.name = name;
        this.description = description;
        this.permissions.clear();
        this.permissions.addAll(permissions);
        this.updatedAt = now;
    }
}
