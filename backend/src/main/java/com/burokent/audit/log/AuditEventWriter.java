package com.burokent.audit.log;

import com.burokent.audit.ActorDirectory;
import com.burokent.audit.AuditEntry;
import com.burokent.shared.RequestIds;
import jakarta.servlet.http.HttpServletRequest;
import java.sql.Timestamp;
import java.time.Clock;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.Nullable;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import tools.jackson.databind.json.JsonMapper;

/**
 * Writes audit entries synchronously, inside the publisher's transaction: if the entry cannot be written, the change
 * is rolled back too.
 */
@Component
@RequiredArgsConstructor
class AuditEventWriter {

    private static final int USER_AGENT_MAX_LENGTH = 512;
    private static final int LABEL_MAX_LENGTH = 255;

    private final JdbcClient jdbc;
    private final JsonMapper jsonMapper;
    private final Clock clock;
    private final ObjectProvider<ActorDirectory> actors;

    @EventListener
    void write(AuditEntry entry) {
        Long actorUserId = entry.actorUserId() != null ? entry.actorUserId() : currentUserId();
        String actorName = actorUserId == null
                ? null
                : actors.stream()
                        .flatMap(directory -> directory.displayName(actorUserId).stream())
                        .findFirst()
                        .orElse(null);
        HttpServletRequest request = currentRequest();
        jdbc.sql("""
                        insert into audit_events (occurred_at, actor_user_id, actor_name, action, entity_type,
                            entity_id, entity_label, changes, ip, user_agent, request_id)
                        values (:occurredAt, :actorUserId, :actorName, :action, :entityType,
                            :entityId, :entityLabel, cast(:changes as jsonb), :ip, :userAgent, :requestId)
                        """)
                .param("occurredAt", Timestamp.from(clock.instant()))
                .param("actorUserId", actorUserId)
                .param("actorName", actorName)
                .param("action", entry.action())
                .param("entityType", entry.entityType())
                .param("entityId", entry.entityId())
                .param("entityLabel", truncate(entry.entityLabel(), LABEL_MAX_LENGTH))
                .param("changes", jsonMapper.writeValueAsString(toJson(entry.changes())))
                .param("ip", request == null ? null : request.getRemoteAddr())
                .param(
                        "userAgent",
                        request == null ? null : truncate(request.getHeader("User-Agent"), USER_AGENT_MAX_LENGTH))
                .param("requestId", RequestIds.current())
                .update();
    }

    private static List<Map<String, @Nullable String>> toJson(List<AuditEntry.Change> changes) {
        return changes.stream()
                .map(change -> {
                    Map<String, @Nullable String> json = new LinkedHashMap<>();
                    json.put("field", change.field());
                    json.put("old", change.oldValue());
                    json.put("new", change.newValue());
                    if (change.visibleWith() != null) {
                        json.put("visibleWith", change.visibleWith());
                    }
                    return json;
                })
                .toList();
    }

    private static @Nullable Long currentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null
                || !authentication.isAuthenticated()
                || authentication instanceof AnonymousAuthenticationToken) {
            return null;
        }
        try {
            return Long.parseLong(authentication.getName());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static @Nullable HttpServletRequest currentRequest() {
        return RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attributes
                ? attributes.getRequest()
                : null;
    }

    private static @Nullable String truncate(@Nullable String value, int maxLength) {
        if (value == null || value.length() <= maxLength) {
            return value;
        }
        return value.substring(0, maxLength);
    }
}
