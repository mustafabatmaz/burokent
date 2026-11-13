import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useParams } from "react-router";
import { Can } from "../../auth/Can.tsx";
import { useSession } from "../../auth/session.tsx";
import { ConfirmDialog } from "../../components/ConfirmDialog.tsx";
import { applyServerErrors } from "../../components/form/serverErrors.ts";
import { Field, fieldA11y } from "../../components/form/Field.tsx";
import { useUnsavedChanges } from "../../components/form/useUnsavedChanges.tsx";
import { FormActions } from "../../components/FormActions.tsx";
import { useToast } from "../../components/Toaster.tsx";
import { Badge } from "../../components/ui/badge.tsx";
import { Button } from "../../components/ui/button.tsx";
import { Card } from "../../components/ui/card.tsx";
import { Input } from "../../components/ui/input.tsx";
import { Select } from "../../components/ui/select.tsx";
import { AuditHistory } from "../../features/audit/AuditHistory.tsx";
import { rolesQuery, userQuery, usersQuery, type UserView } from "../../features/identity/queries.ts";
import { api } from "../../lib/api.ts";
import { asProblem } from "../../lib/problem.ts";
import { errorText, messages } from "../../messages.ts";
import { NotFoundPage } from "../NotFoundPage.tsx";

interface Values {
  displayName: string;
  roleId: string;
}

function toValues(user: UserView): Values {
  return { displayName: user.displayName, roleId: user.roleId ? String(user.roleId) : "" };
}

export function UserDetailPage() {
  const id = Number(useParams().id);
  const user = useQuery(userQuery(id));

  if (user.isPending) {
    return (
      <p role="status" className="text-muted-foreground">
        {messages.loading}
      </p>
    );
  }
  if (user.isError) {
    return asProblem(user.error).code === "not_found" ? <NotFoundPage /> : <p>{messages.common.loadError}</p>;
  }
  return (
    <div className="flex flex-col gap-6">
      <UserHeader user={user.data} />
      {user.data.superAdmin ? (
        <Card className="p-4 text-muted-foreground md:p-6">{messages.users.superAdminNote}</Card>
      ) : (
        <>
          <UserForm user={user.data} />
          <Can permission="identity.manage">
            <UserActions user={user.data} />
          </Can>
        </>
      )}
      <AuditHistory entityType="user" entityId={String(id)} />
    </div>
  );
}

function UserHeader({ user }: { user: UserView }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <h2 className="text-xl font-semibold">{user.displayName}</h2>
      <span className="text-muted-foreground">{user.username}</span>
      {user.superAdmin && <Badge variant="primary">{messages.users.superAdmin}</Badge>}
      {user.archived && <Badge>{messages.common.archived}</Badge>}
    </div>
  );
}

function UserForm({ user }: { user: UserView }) {
  const me = useSession();
  const canManage = me.permissions.includes("identity.manage");
  const roles = useQuery(rolesQuery);
  const queryClient = useQueryClient();
  const toast = useToast();
  const [conflict, setConflict] = useState(false);
  // values keeps the form in step with the loaded record (also after "reload" on a conflict)
  const form = useForm<Values>({ values: toValues(user) });
  const { errors, isDirty, isSubmitting } = form.formState;
  const { dialog } = useUnsavedChanges(isDirty);
  const f = messages.users.fields;

  async function submit(values: Values) {
    const { data, error } = await api.PUT("/api/admin/users/{id}", {
      params: { path: { id: user.id } },
      body: {
        displayName: values.displayName,
        version: user.version,
        ...(values.roleId ? { roleId: Number(values.roleId) } : {}),
      },
    });
    if (!data) {
      const problem = asProblem(error);
      if (problem.code === "conflict") {
        setConflict(true);
      } else if (!applyServerErrors(form, problem)) {
        toast.error(errorText(problem.code));
      }
      return;
    }
    queryClient.setQueryData(userQuery(user.id).queryKey, data);
    await queryClient.invalidateQueries({ queryKey: usersQuery.queryKey, exact: true });
    toast.success(messages.users.updated);
  }

  async function reload() {
    setConflict(false);
    await queryClient.invalidateQueries({ queryKey: userQuery(user.id).queryKey });
  }

  // The role select needs its options before it mounts, or it falls back to "no role"
  if (roles.isPending) {
    return (
      <p role="status" className="text-muted-foreground">
        {messages.loading}
      </p>
    );
  }

  return (
    <Card className="p-4 md:p-6">
      <form onSubmit={(event) => void form.handleSubmit(submit)(event)} noValidate className="flex flex-col gap-4">
        <fieldset disabled={!canManage} className="grid gap-4 md:grid-cols-2">
          <Field id="displayName" label={f.displayName} required error={errors.displayName?.message}>
            <Input
              {...fieldA11y("displayName", errors.displayName?.message)}
              {...form.register("displayName", { required: messages.common.required })}
            />
          </Field>
          <Field id="roleId" label={f.role} error={errors.roleId?.message}>
            <Select {...fieldA11y("roleId", errors.roleId?.message)} {...form.register("roleId")}>
              <option value="">{f.noRole}</option>
              {roles.data?.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </Select>
          </Field>
        </fieldset>
        {canManage && <FormActions submitting={isSubmitting} />}
      </form>
      {dialog}
      <ConfirmDialog
        open={conflict}
        title={messages.common.conflictTitle}
        description={messages.common.conflictDescription}
        confirmLabel={messages.common.reload}
        onConfirm={() => void reload()}
        onCancel={() => setConflict(false)}
      />
    </Card>
  );
}

type Action = "archive" | "unarchive" | "endSessions" | "resetPassword";

function UserActions({ user }: { user: UserView }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [action, setAction] = useState<Action | null>(null);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string>();
  const a = messages.users.actions;

  async function run(current: Action) {
    const path = { params: { path: { id: user.id } } };
    let result: { error?: unknown; response: Response };
    if (current === "archive") {
      result = await api.POST("/api/admin/users/{id}/archive", path);
    } else if (current === "unarchive") {
      result = await api.POST("/api/admin/users/{id}/unarchive", path);
    } else if (current === "endSessions") {
      result = await api.POST("/api/admin/users/{id}/sessions/revoke", path);
    } else {
      result = await api.POST("/api/admin/users/{id}/password", { ...path, body: { password } });
    }
    if (!result.response.ok) {
      const problem = asProblem(result.error);
      if (current === "resetPassword" && problem.errors?.[0]) {
        setPasswordError(errorText(problem.errors[0].code));
        return;
      }
      setAction(null);
      toast.error(errorText(problem.code));
      return;
    }
    setAction(null);
    setPassword("");
    setPasswordError(undefined);
    await queryClient.invalidateQueries({ queryKey: usersQuery.queryKey });
    await queryClient.invalidateQueries({ queryKey: ["audit-events"] });
    toast.success(
      {
        archive: messages.users.archivedToast,
        unarchive: messages.users.unarchivedToast,
        endSessions: messages.users.sessionsEnded,
        resetPassword: messages.users.passwordReset,
      }[current],
    );
  }

  const confirm = {
    archive: {
      title: messages.users.confirmArchive(user.displayName),
      description: messages.users.confirmArchiveDescription,
      label: a.archive,
    },
    unarchive: { title: a.unarchive, description: undefined, label: a.unarchive },
    endSessions: {
      title: messages.users.confirmEndSessions(user.displayName),
      description: messages.users.confirmEndSessionsDescription,
      label: a.endSessions,
    },
    resetPassword: {
      title: messages.users.resetPasswordTitle(user.displayName),
      description: messages.users.resetPasswordDescription,
      label: a.resetPassword,
    },
  };

  return (
    <Card className="flex flex-col gap-2 p-4 sm:flex-row sm:flex-wrap md:p-6">
      <Button variant="outline" onClick={() => setAction("resetPassword")}>
        {a.resetPassword}
      </Button>
      <Button variant="outline" onClick={() => setAction("endSessions")}>
        {a.endSessions}
      </Button>
      {user.archived ? (
        <Button variant="outline" onClick={() => setAction("unarchive")}>
          {a.unarchive}
        </Button>
      ) : (
        <Button variant="outline" onClick={() => setAction("archive")}>
          {a.archive}
        </Button>
      )}
      {action && (
        <ConfirmDialog
          open
          title={confirm[action].title}
          {...(confirm[action].description ? { description: confirm[action].description } : {})}
          confirmLabel={confirm[action].label}
          onConfirm={() => void run(action)}
          onCancel={() => {
            setAction(null);
            setPasswordError(undefined);
          }}
        >
          {action === "resetPassword" && (
            <div className="mt-4">
              <Field
                id="newPassword"
                label={messages.users.newPassword}
                required
                hint={messages.users.fields.passwordHint}
                error={passwordError}
              >
                <Input
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  {...fieldA11y("newPassword", passwordError, messages.users.fields.passwordHint)}
                />
              </Field>
            </div>
          )}
        </ConfirmDialog>
      )}
    </Card>
  );
}
