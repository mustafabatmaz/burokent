package com.burokent.audit.log;

import com.burokent.audit.AuditPermissions;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.Nullable;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.web.PagedModel;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

@RestController
@RequiredArgsConstructor
class AuditEventController {

    private static final int DEFAULT_SIZE = 50;
    private static final int MAX_SIZE = 100;
    private static final TypeReference<List<Map<String, @Nullable String>>> CHANGES = new TypeReference<>() {};

    private final JdbcClient jdbc;
    private final JsonMapper jsonMapper;

    @JsonInclude(JsonInclude.Include.NON_NULL)
    record ChangeView(
            String field,
            @JsonProperty("old") @Nullable String oldValue,
            @JsonProperty("new") @Nullable String newValue,
            boolean masked) {}

    record AuditEventView(
            long id,
            Instant occurredAt,
            @Nullable Long actorUserId,
            @Nullable String actorName,
            String action,
            String entityType,
            @Nullable String entityId,
            @Nullable String entityLabel,
            List<ChangeView> changes,
            @Nullable String ip,
            @Nullable String userAgent,
            @Nullable String requestId) {}

    @GetMapping("/api/admin/audit-events")
    @PreAuthorize("hasAuthority('" + AuditPermissions.READ + "')")
    @Transactional(readOnly = true)
    PagedModel<AuditEventView> list(
            @RequestParam(required = false) @Nullable Long actorUserId,
            @RequestParam(required = false) @Nullable String action,
            @RequestParam(required = false) @Nullable String entityType,
            @RequestParam(required = false) @Nullable String entityId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) @Nullable Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) @Nullable Instant to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "" + DEFAULT_SIZE) int size) {
        int pageSize = Math.clamp(size, 1, MAX_SIZE);
        int pageNumber = Math.max(page, 0);

        List<String> conditions = new ArrayList<>();
        Map<String, Object> params = new HashMap<>();
        addCondition(conditions, params, "actor_user_id = :actorUserId", "actorUserId", actorUserId);
        addCondition(conditions, params, "action = :action", "action", action);
        addCondition(conditions, params, "entity_type = :entityType", "entityType", entityType);
        addCondition(conditions, params, "entity_id = :entityId", "entityId", entityId);
        addCondition(conditions, params, "occurred_at >= :from", "from", from == null ? null : Timestamp.from(from));
        addCondition(conditions, params, "occurred_at < :to", "to", to == null ? null : Timestamp.from(to));
        String where = conditions.isEmpty() ? "" : " where " + String.join(" and ", conditions);

        long total = jdbc.sql("select count(*) from audit_events" + where)
                .params(params)
                .query(Long.class)
                .single();
        Set<String> readerPermissions = readerPermissions();
        List<AuditEventView> content = jdbc.sql("select * from audit_events" + where
                        + " order by occurred_at desc, id desc limit :limit offset :offset")
                .params(params)
                .param("limit", pageSize)
                .param("offset", (long) pageNumber * pageSize)
                .query((rs, row) -> new AuditEventView(
                        rs.getLong("id"),
                        rs.getTimestamp("occurred_at").toInstant(),
                        rs.getObject("actor_user_id", Long.class),
                        rs.getString("actor_name"),
                        rs.getString("action"),
                        rs.getString("entity_type"),
                        rs.getString("entity_id"),
                        rs.getString("entity_label"),
                        changes(rs.getString("changes"), readerPermissions),
                        rs.getString("ip"),
                        rs.getString("user_agent"),
                        rs.getString("request_id")))
                .list();
        return new PagedModel<>(new PageImpl<>(content, PageRequest.of(pageNumber, pageSize), total));
    }

    private List<ChangeView> changes(String json, Set<String> readerPermissions) {
        return jsonMapper.readValue(json, CHANGES).stream()
                .map(change -> {
                    String visibleWith = change.get("visibleWith");
                    boolean masked = visibleWith != null && !readerPermissions.contains(visibleWith);
                    return masked
                            ? new ChangeView(change.get("field"), null, null, true)
                            : new ChangeView(change.get("field"), change.get("old"), change.get("new"), false);
                })
                .toList();
    }

    private static Set<String> readerPermissions() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) {
            return Set.of();
        }
        return authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.toSet());
    }

    private static void addCondition(
            List<String> conditions,
            Map<String, Object> params,
            String condition,
            String name,
            @Nullable Object value) {
        if (value != null) {
            conditions.add(condition);
            params.put(name, value);
        }
    }
}
