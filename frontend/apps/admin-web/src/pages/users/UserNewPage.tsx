import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router";
import { applyServerErrors } from "../../components/form/serverErrors.ts";
import { Field, fieldA11y } from "../../components/form/Field.tsx";
import { useUnsavedChanges } from "../../components/form/useUnsavedChanges.tsx";
import { FormActions } from "../../components/FormActions.tsx";
import { useToast } from "../../components/Toaster.tsx";
import { Card } from "../../components/ui/card.tsx";
import { Input } from "../../components/ui/input.tsx";
import { Select } from "../../components/ui/select.tsx";
import { rolesQuery, usersQuery } from "../../features/identity/queries.ts";
import { api } from "../../lib/api.ts";
import { asProblem } from "../../lib/problem.ts";
import { errorText, messages } from "../../messages.ts";

interface Values {
  username: string;
  displayName: string;
  password: string;
  roleId: string;
}

export function UserNewPage() {
  const roles = useQuery(rolesQuery);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const toast = useToast();
  const form = useForm<Values>({ defaultValues: { username: "", displayName: "", password: "", roleId: "" } });
  const { errors, isDirty, isSubmitting } = form.formState;
  const { dialog, allowLeaving } = useUnsavedChanges(isDirty);
  const f = messages.users.fields;

  async function submit(values: Values) {
    const { data, error } = await api.POST("/api/admin/users", {
      body: {
        username: values.username,
        displayName: values.displayName,
        password: values.password,
        ...(values.roleId ? { roleId: Number(values.roleId) } : {}),
      },
    });
    if (!data) {
      const problem = asProblem(error);
      if (!applyServerErrors(form, problem, { username_taken: "username" })) {
        toast.error(errorText(problem.code));
      }
      return;
    }
    await queryClient.invalidateQueries({ queryKey: usersQuery.queryKey });
    toast.success(messages.users.created);
    allowLeaving();
    await navigate(`/kullanicilar/${data.id}`);
  }

  const required = { required: messages.common.required };
  return (
    <Card className="p-4 md:p-6">
      <h2 className="mb-4 text-lg font-semibold">{messages.users.new}</h2>
      <form onSubmit={(event) => void form.handleSubmit(submit)(event)} noValidate className="flex flex-col gap-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Field id="username" label={f.username} required error={errors.username?.message}>
            <Input
              {...fieldA11y("username", errors.username?.message)}
              autoCapitalize="none"
              autoComplete="off"
              {...form.register("username", required)}
            />
          </Field>
          <Field id="displayName" label={f.displayName} required error={errors.displayName?.message}>
            <Input
              {...fieldA11y("displayName", errors.displayName?.message)}
              {...form.register("displayName", required)}
            />
          </Field>
          <Field id="password" label={f.password} required hint={f.passwordHint} error={errors.password?.message}>
            <Input
              type="password"
              autoComplete="new-password"
              {...fieldA11y("password", errors.password?.message, f.passwordHint)}
              {...form.register("password", required)}
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
        </div>
        <FormActions submitting={isSubmitting} />
      </form>
      {dialog}
    </Card>
  );
}
