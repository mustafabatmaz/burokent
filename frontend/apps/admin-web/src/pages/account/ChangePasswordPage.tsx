import { useForm } from "react-hook-form";
import { applyServerErrors } from "../../components/form/serverErrors.ts";
import { Field, fieldA11y } from "../../components/form/Field.tsx";
import { useUnsavedChanges } from "../../components/form/useUnsavedChanges.tsx";
import { FormActions } from "../../components/FormActions.tsx";
import { useToast } from "../../components/Toaster.tsx";
import { Card } from "../../components/ui/card.tsx";
import { Input } from "../../components/ui/input.tsx";
import { api } from "../../lib/api.ts";
import { asProblem } from "../../lib/problem.ts";
import { errorText, messages } from "../../messages.ts";

interface Values {
  currentPassword: string;
  newPassword: string;
}

export function ChangePasswordPage() {
  const toast = useToast();
  const form = useForm<Values>({ defaultValues: { currentPassword: "", newPassword: "" } });
  const { errors, isDirty, isSubmitting } = form.formState;
  const { dialog } = useUnsavedChanges(isDirty);
  const hint = messages.users.fields.passwordHint;

  async function submit(values: Values) {
    const { error, response } = await api.POST("/api/admin/me/password", { body: values });
    if (!response.ok) {
      const problem = asProblem(error);
      if (!applyServerErrors(form, problem)) {
        toast.error(errorText(problem.code));
      }
      return;
    }
    form.reset();
    toast.success(messages.account.changed);
  }

  const required = { required: messages.common.required };
  return (
    <section className="flex max-w-xl flex-col gap-4">
      <h1 className="text-2xl font-semibold">{messages.account.changePassword}</h1>
      <Card className="p-4 md:p-6">
        <form onSubmit={(event) => void form.handleSubmit(submit)(event)} noValidate className="flex flex-col gap-4">
          <Field
            id="currentPassword"
            label={messages.account.currentPassword}
            required
            error={errors.currentPassword?.message}
          >
            <Input
              type="password"
              autoComplete="current-password"
              {...fieldA11y("currentPassword", errors.currentPassword?.message)}
              {...form.register("currentPassword", required)}
            />
          </Field>
          <Field
            id="newPassword"
            label={messages.account.newPassword}
            required
            hint={hint}
            error={errors.newPassword?.message}
          >
            <Input
              type="password"
              autoComplete="new-password"
              {...fieldA11y("newPassword", errors.newPassword?.message, hint)}
              {...form.register("newPassword", required)}
            />
          </Field>
          <FormActions submitting={isSubmitting} />
        </form>
      </Card>
      {dialog}
    </section>
  );
}
