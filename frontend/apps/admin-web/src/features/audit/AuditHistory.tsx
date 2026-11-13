import { useQuery } from "@tanstack/react-query";
import { useId } from "react";
import { Can } from "../../auth/Can.tsx";
import { Card } from "../../components/ui/card.tsx";
import { messages } from "../../messages.ts";
import { rolesQuery, roleNames } from "../identity/queries.ts";
import { AuditEntry } from "./AuditEntry.tsx";
import { auditEventsQuery } from "./queries.ts";

function History({ entityType, entityId }: { entityType: string; entityId: string }) {
  const headingId = useId();
  const events = useQuery(auditEventsQuery({ entityType, entityId, page: 0, size: 25 }));
  const roles = useQuery(rolesQuery);
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h2 id={headingId} className="text-lg font-semibold">
        {messages.audit.history}
      </h2>
      <Card className="p-4">
        {events.isPending ? (
          <p role="status" className="text-muted-foreground">
            {messages.loading}
          </p>
        ) : events.isError ? (
          <p>{messages.common.loadError}</p>
        ) : events.data.content.length === 0 ? (
          <p className="text-muted-foreground">{messages.audit.empty}</p>
        ) : (
          <ol className="flex flex-col divide-y">
            {events.data.content.map((event) => (
              <li key={event.id} className="py-3 first:pt-0 last:pb-0">
                <AuditEntry event={event} roleNames={roleNames(roles.data)} />
              </li>
            ))}
          </ol>
        )}
      </Card>
    </section>
  );
}

/** The "Geçmiş" section of a record page, for users who may read the activity log. */
export function AuditHistory(props: { entityType: string; entityId: string }) {
  return (
    <Can permission="audit.read">
      <History {...props} />
    </Can>
  );
}
