import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { Link } from "react-router";
import { Can } from "../../auth/Can.tsx";
import { DataTable } from "../../components/data-table/DataTable.tsx";
import { buttonVariants } from "../../components/ui/button.tsx";
import { rolesQuery, type RoleView } from "../../features/identity/queries.ts";
import { messages } from "../../messages.ts";

const columns: ColumnDef<RoleView>[] = [
  { accessorKey: "name", header: messages.roles.columns.name, enableSorting: true },
  {
    id: "permissions",
    header: messages.roles.columns.permissions,
    cell: ({ row }) => messages.roles.permissionCount(row.original.permissions.length),
    enableSorting: false,
  },
];

export function RolesListPage() {
  const roles = useQuery(rolesQuery);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Can permission="identity.manage">
          <Link to="/kullanicilar/roller/yeni" className={buttonVariants()}>
            <Plus aria-hidden />
            {messages.roles.new}
          </Link>
        </Can>
      </div>
      <DataTable<RoleView>
        caption={messages.users.tabRoles}
        columns={columns}
        data={roles.data}
        isPending={roles.isPending}
        isError={roles.isError}
        onRetry={() => void roles.refetch()}
        emptyMessage={messages.roles.empty}
        getRowHref={(role) => `/kullanicilar/roller/${role.id}`}
        renderCard={(role) => (
          <div>
            <p className="font-medium">{role.name}</p>
            <p className="text-sm text-muted-foreground">{messages.roles.permissionCount(role.permissions.length)}</p>
          </div>
        )}
      />
    </div>
  );
}
