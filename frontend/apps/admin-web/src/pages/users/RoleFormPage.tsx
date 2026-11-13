import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Lock } from "lucide-react";
import { useId, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router";
import { useSession } from "../../auth/session.tsx";
import { ConfirmDialog } from "../../components/ConfirmDialog.tsx";
import { applyServerErrors } from "../../components/form/serverErrors.ts";
import { Field, fieldA11y } from "../../components/form/Field.tsx";
import { useUnsavedChanges } from "../../components/form/useUnsavedChanges.tsx";
import { FormActions } from "../../components/FormActions.tsx";
import { useToast } from "../../components/Toaster.tsx";
import { Card } from "../../components/ui/card.tsx";
import { Input } from "../../components/ui/input.tsx";
import { AuditHistory } from "../../features/audit/AuditHistory.tsx";
import {
  permissionsQuery,
  roleQuery,
  rolesQuery,
  type PermissionDefinition,
  type RoleView,
} from "../../features/identity/queries.ts";
import { api } from "../../lib/api.ts";
import { asProblem } from "../../lib/problem.ts";
import { errorText, messages } from "../../messages.ts";
import { NotFoundPage } from "../NotFoundPage.tsx";

interface Values {
  name: string;
  description: string;
  permissions: string[];
}

const EMPTY: Values = { name: "", description: "", permissions: [] };

export function RoleNewPage() {
  return <RoleForm role={undefined} />;
}

export function RoleEditPage() {
  const id = Number(useParams().id);
  const role = useQuery(roleQuery(id));
  if (role.isPending) {
    return (
      <p role="status" className="text-muted-foreground">
        {messages.loading}
      </p>
    );
  }
  if (role.isError) {
    return asProblem(role.error).code === "not_found" ? <NotFoundPage /> : <p>{messages.common.loadError}</p>;
  }
  return (
    <div className="flex flex-col gap-6">
      <RoleForm role={role.data} />
      <AuditHistory entityType="role" entityId={String(id)} />
    </div>
  );
}

function RoleForm({ role }: { role: RoleView | undefined }) {
  const me = useSession();
  const canManage = me.permissions.includes("identity.manage");
  const permissions = useQuery(permissionsQuery);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const toast = useToast();
  const [conflict, setConflict] = useState(false);
  const form = useForm<Values>(
    role
      ? { values: { name: role.name, description: role.description ?? "", permissions: [...role.permissions] } }
      : { defaultValues: EMPTY },
  );
  const { errors, isDirty, isSubmitting } = form.formState;
  const { dialog, allowLeaving } = useUnsavedChanges(isDirty);
  const f = messages.roles.fields;

  async function submit(values: Values) {
    const body = {
      name: values.name,
      permissions: values.permissions,
      ...(values.description ? { description: values.description } : {}),
    };
    const result = role
      ? await api.PUT("/api/admin/roles/{id}", {
          params: { path: { id: role.id } },
          body: { ...body, version: role.version },
        })
      : await api.POST("/api/admin/roles", { body });
    if (!result.data) {
      const problem = asProblem(result.error);
      if (problem.code === "conflict") {
        setConflict(true);
      } else if (!applyServerErrors(form, problem, { role_name_taken: "name" })) {
        toast.error(errorText(problem.code));
      }
      return;
    }
    await queryClient.invalidateQueries({ queryKey: rolesQuery.queryKey });
    if (role) {
      queryClient.setQueryData(roleQuery(role.id).queryKey, result.data);
      toast.success(messages.roles.updated);
      return;
    }
    toast.success(messages.roles.created);
    allowLeaving();
    await navigate(`/kullanicilar/roller/${result.data.id}`);
  }

  return (
    <Card className="p-4 md:p-6">
      <h2 className="mb-4 text-lg font-semibold">{role ? role.name : messages.roles.new}</h2>
      <form onSubmit={(event) => void form.handleSubmit(submit)(event)} noValidate className="flex flex-col gap-4">
        <fieldset disabled={!canManage} className="flex flex-col gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field id="name" label={f.name} required error={errors.name?.message}>
              <Input
                {...fieldA11y("name", errors.name?.message)}
                {...form.register("name", { required: messages.common.required })}
              />
            </Field>
            <Field id="description" label={f.description} error={errors.description?.message}>
              <Input {...fieldA11y("description", errors.description?.message)} {...form.register("description")} />
            </Field>
          </div>
          <Controller
            control={form.control}
            name="permissions"
            render={({ field }) => (
              <PermissionChecklist permissions={permissions.data ?? []} value={field.value} onChange={field.onChange} />
            )}
          />
        </fieldset>
        {canManage && <FormActions submitting={isSubmitting} />}
      </form>
      {dialog}
      <ConfirmDialog
        open={conflict}
        title={messages.common.conflictTitle}
        description={messages.common.conflictDescription}
        confirmLabel={messages.common.reload}
        onConfirm={() => {
          setConflict(false);
          if (role) {
            void queryClient.invalidateQueries({ queryKey: roleQuery(role.id).queryKey });
          }
        }}
        onCancel={() => setConflict(false)}
      />
    </Card>
  );
}

/** Delegable permissions as checkboxes; the others are listed as held by the super admin only. */
function PermissionChecklist({
  permissions,
  value,
  onChange,
}: {
  permissions: PermissionDefinition[];
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const legendId = useId();
  return (
    <div role="group" aria-labelledby={legendId} className="flex flex-col gap-2">
      <p id={legendId} className="text-sm font-medium">
        {messages.roles.fields.permissions}
      </p>
      <ul className="flex flex-col divide-y rounded-lg border">
        {permissions.map((permission) => {
          const text = messages.permissions[permission.code] ?? { label: permission.code, description: "" };
          const id = `permission-${permission.code}`;
          return (
            <li key={permission.code} className="flex min-h-14 items-start gap-3 p-3">
              {permission.delegable ? (
                <input
                  id={id}
                  type="checkbox"
                  className="mt-1 size-5 accent-primary"
                  checked={value.includes(permission.code)}
                  onChange={(event) =>
                    onChange(
                      event.target.checked
                        ? [...value, permission.code]
                        : value.filter((code) => code !== permission.code),
                    )
                  }
                />
              ) : (
                <Lock className="mt-1 size-5 text-muted-foreground" aria-hidden />
              )}
              <div className="flex flex-col">
                {permission.delegable ? (
                  <label htmlFor={id} className="font-medium">
                    {text.label}
                  </label>
                ) : (
                  <span className="font-medium">{text.label}</span>
                )}
                <span className="text-sm text-muted-foreground">
                  {permission.delegable ? text.description : messages.roles.notDelegable}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
