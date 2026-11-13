import { messages } from "../../messages.ts";
import { describeChange, formatAuditEvent, formatDateTime } from "./format.ts";
import type { AuditEventView } from "./queries.ts";

/** Sentence, time and changed fields of one activity entry. */
export function AuditEntry({ event, roleNames }: { event: AuditEventView; roleNames: Record<number, string> }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="font-medium">{formatAuditEvent(event)}</p>
      <p className="text-xs text-muted-foreground">
        <time dateTime={event.occurredAt}>{formatDateTime(event.occurredAt)}</time>
        {event.ip && ` · ${event.ip}`}
      </p>
      {event.changes.length > 0 && (
        <ul className="mt-1 flex flex-col gap-0.5 text-sm text-muted-foreground">
          {event.changes.map((change) => (
            <li key={change.field}>{describeChange(change, { roleNames })}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function auditActionOptions(): { value: string; label: string }[] {
  return Object.entries(messages.audit.actions).map(([value, label]) => ({ value, label }));
}
