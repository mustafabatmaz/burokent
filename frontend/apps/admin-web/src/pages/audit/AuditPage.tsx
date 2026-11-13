import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { useSearchParams } from "react-router";
import { useSession } from "../../auth/session.tsx";
import { DataTable } from "../../components/data-table/DataTable.tsx";
import { Button } from "../../components/ui/button.tsx";
import { Input } from "../../components/ui/input.tsx";
import { Label } from "../../components/ui/label.tsx";
import { Select } from "../../components/ui/select.tsx";
import { AuditEntry, auditActionOptions } from "../../features/audit/AuditEntry.tsx";
import { describeChange, formatAuditEvent, formatDateTime } from "../../features/audit/format.ts";
import { auditEventsQuery, type AuditEventView, type AuditFilter } from "../../features/audit/queries.ts";
import { roleNames, rolesQuery, usersQuery } from "../../features/identity/queries.ts";
import { messages } from "../../messages.ts";

// Filters live in the address, so a filtered view can be shared or bookmarked
const PARAM = { actor: "kisi", action: "islem", from: "baslangic", to: "bitis", page: "sayfa", size: "boyut" };

/** A date picked in Turkey, as the start of that day in Turkish time (UTC+3, no daylight saving). */
function startOfDay(date: string): string {
  return `${date}T00:00:00+03:00`;
}

function nextDay(date: string): string {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return startOfDay(next.toISOString().slice(0, 10));
}

export function AuditPage() {
  const me = useSession();
  const [params, setParams] = useSearchParams();
  const canSeeUsers = me.permissions.includes("identity.read");
  const users = useQuery({ ...usersQuery, enabled: canSeeUsers });
  const roles = useQuery({ ...rolesQuery, enabled: canSeeUsers });
  const names = roleNames(roles.data);

  const actor = params.get(PARAM.actor);
  const action = params.get(PARAM.action);
  const from = params.get(PARAM.from);
  const to = params.get(PARAM.to);
  const filter: AuditFilter = {
    page: Number(params.get(PARAM.page) ?? "0"),
    size: Number(params.get(PARAM.size) ?? "50"),
    ...(actor ? { actorUserId: Number(actor) } : {}),
    ...(action ? { action } : {}),
    ...(from ? { from: startOfDay(from) } : {}),
    ...(to ? { to: nextDay(to) } : {}),
  };
  const events = useQuery(auditEventsQuery(filter));

  function update(changes: Record<string, string | null>) {
    setParams((current) => {
      const next = new URLSearchParams(current);
      for (const [key, value] of Object.entries(changes)) {
        if (value) {
          next.set(key, value);
        } else {
          next.delete(key);
        }
      }
      if (!(PARAM.page in changes)) {
        next.delete(PARAM.page);
      }
      return next;
    });
  }

  const columns: ColumnDef<AuditEventView>[] = [
    {
      id: "time",
      header: messages.audit.columns.time,
      cell: ({ row }) => (
        <time dateTime={row.original.occurredAt} className="whitespace-nowrap text-muted-foreground">
          {formatDateTime(row.original.occurredAt)}
        </time>
      ),
    },
    { id: "event", header: messages.audit.columns.event, cell: ({ row }) => formatAuditEvent(row.original) },
    {
      id: "changes",
      header: messages.audit.columns.changes,
      cell: ({ row }) => <AuditChanges event={row.original} roleNames={names} />,
    },
  ];

  const f = messages.audit.filters;
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">{messages.audit.title}</h1>
      <div className="grid grid-cols-2 items-end gap-3 lg:grid-cols-5">
        {canSeeUsers && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="filter-actor">{f.actor}</Label>
            <Select
              id="filter-actor"
              value={actor ?? ""}
              onChange={(event) => update({ [PARAM.actor]: event.target.value })}
            >
              <option value="">{f.all}</option>
              {users.data?.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.displayName}
                </option>
              ))}
            </Select>
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filter-action">{f.action}</Label>
          <Select
            id="filter-action"
            value={action ?? ""}
            onChange={(event) => update({ [PARAM.action]: event.target.value })}
          >
            <option value="">{f.all}</option>
            {auditActionOptions().map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filter-from">{f.from}</Label>
          <Input
            id="filter-from"
            type="date"
            value={from ?? ""}
            onChange={(event) => update({ [PARAM.from]: event.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filter-to">{f.to}</Label>
          <Input
            id="filter-to"
            type="date"
            value={to ?? ""}
            onChange={(event) => update({ [PARAM.to]: event.target.value })}
          />
        </div>
        <Button
          variant="ghost"
          className="col-span-2 lg:col-span-1"
          disabled={!actor && !action && !from && !to}
          onClick={() => update({ [PARAM.actor]: null, [PARAM.action]: null, [PARAM.from]: null, [PARAM.to]: null })}
        >
          {f.clear}
        </Button>
      </div>
      <DataTable<AuditEventView>
        caption={messages.audit.title}
        columns={columns}
        data={events.data?.content}
        isPending={events.isPending}
        isError={events.isError}
        onRetry={() => void events.refetch()}
        emptyMessage={messages.audit.empty}
        renderCard={(event) => <AuditEntry event={event} roleNames={names} />}
        pagination={{
          page: filter.page,
          size: filter.size,
          total: events.data?.page?.totalElements ?? 0,
          onPageChange: (page) => update({ [PARAM.page]: String(page) }),
          onSizeChange: (size) => update({ [PARAM.size]: String(size) }),
        }}
      />
    </section>
  );
}

function AuditChanges({ event, roleNames: names }: { event: AuditEventView; roleNames: Record<number, string> }) {
  if (event.changes.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <ul className="flex flex-col gap-0.5 text-muted-foreground">
      {event.changes.map((change) => (
        <li key={change.field}>{describeChange(change, { roleNames: names })}</li>
      ))}
    </ul>
  );
}
