import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { Link } from "react-router";
import { Can } from "../../auth/Can.tsx";
import { DataTable } from "../../components/data-table/DataTable.tsx";
import { Badge } from "../../components/ui/badge.tsx";
import { buttonVariants } from "../../components/ui/button.tsx";
import { roleNames, rolesQuery, usersQuery, type UserView } from "../../features/identity/queries.ts";
import { messages } from "../../messages.ts";

function RoleLabel({ user, names }: { user: UserView; names: Record<number, string> }) {
  if (user.superAdmin) {
    return <Badge variant="primary">{messages.users.superAdmin}</Badge>;
  }
  return <span>{user.roleId ? (names[user.roleId] ?? "") : "—"}</span>;
}

function Status({ user }: { user: UserView }) {
  return user.archived ? <Badge>{messages.common.archived}</Badge> : <span>{messages.common.active}</span>;
}

export function UsersListPage() {
  const users = useQuery(usersQuery);
  const roles = useQuery(rolesQuery);
  const names = roleNames(roles.data);

  const columns: ColumnDef<UserView>[] = [
    { accessorKey: "displayName", header: messages.users.columns.name, enableSorting: true },
    { accessorKey: "username", header: messages.users.columns.username, enableSorting: true },
    {
      id: "role",
      header: messages.users.columns.role,
      cell: ({ row }) => <RoleLabel user={row.original} names={names} />,
      enableSorting: false,
    },
    {
      id: "status",
      header: messages.users.columns.status,
      cell: ({ row }) => <Status user={row.original} />,
      enableSorting: false,
    },
  ];

  const create = (
    <Can permission="identity.manage">
      <Link to="/kullanicilar/yeni" className={buttonVariants()}>
        <Plus aria-hidden />
        {messages.users.new}
      </Link>
    </Can>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">{create}</div>
      <DataTable<UserView>
        caption={messages.users.tabUsers}
        columns={columns}
        data={users.data}
        isPending={users.isPending}
        isError={users.isError}
        onRetry={() => void users.refetch()}
        emptyMessage={messages.users.empty}
        getRowHref={(user) => `/kullanicilar/${user.id}`}
        renderCard={(user) => (
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium">{user.displayName}</p>
              <p className="text-sm text-muted-foreground">{user.username}</p>
            </div>
            <div className="flex flex-col items-end gap-1 text-sm">
              <RoleLabel user={user} names={names} />
              <Status user={user} />
            </div>
          </div>
        )}
      />
    </div>
  );
}
