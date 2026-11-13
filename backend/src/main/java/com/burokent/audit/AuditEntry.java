package com.burokent.audit;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/**
 * Event describing one change, published with {@code ApplicationEventPublisher}. The actor is the logged-in user
 * unless {@link #byActor(long)} names one (for example during login).
 */
public record AuditEntry(
        String action,
        String entityType,
        @Nullable String entityId,
        @Nullable String entityLabel,
        List<Change> changes,
        @Nullable Long actorUserId) {

    /**
     * One changed field. When {@code visibleWith} is set, readers without that permission see the change masked.
     */
    public record Change(
            String field,
            @Nullable String oldValue,
            @Nullable String newValue,
            @Nullable String visibleWith) {

        public Change(String field, @Nullable String oldValue, @Nullable String newValue) {
            this(field, oldValue, newValue, null);
        }
    }

    public AuditEntry {
        changes = List.copyOf(changes);
    }

    public static AuditEntry of(
            String action, String entityType, @Nullable String entityId, @Nullable String entityLabel) {
        return new AuditEntry(action, entityType, entityId, entityLabel, List.of(), null);
    }

    public AuditEntry withChanges(List<Change> newChanges) {
        return new AuditEntry(action, entityType, entityId, entityLabel, newChanges, actorUserId);
    }

    /** Adds the change only when the value actually differs. */
    public AuditEntry withChange(String field, @Nullable Object oldValue, @Nullable Object newValue) {
        if (Objects.equals(oldValue, newValue)) {
            return this;
        }
        List<Change> all = new ArrayList<>(changes);
        all.add(new Change(field, asText(oldValue), asText(newValue)));
        return withChanges(all);
    }

    public AuditEntry byActor(long userId) {
        return new AuditEntry(action, entityType, entityId, entityLabel, changes, userId);
    }

    private static @Nullable String asText(@Nullable Object value) {
        return value == null ? null : value.toString();
    }
}
