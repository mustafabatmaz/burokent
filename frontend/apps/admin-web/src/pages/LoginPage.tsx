import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { Navigate, useSearchParams } from "react-router";
import { ensureCsrfCookie, meQuery, useMe } from "../auth/session.tsx";
import { Logo } from "../components/BrandMark.tsx";
import { Button } from "../components/ui/button.tsx";
import { Card } from "../components/ui/card.tsx";
import { Input } from "../components/ui/input.tsx";
import { Label } from "../components/ui/label.tsx";
import { api } from "../lib/api.ts";
import { messages } from "../messages.ts";

/** Only local paths, so the login page cannot be used to send people to another site. */
function safeTarget(value: string | null): string {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/";
}

function field(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

function loginError(response: Response): string {
  if (response.status === 401) {
    return messages.login.errors.invalidCredentials;
  }
  if (response.status === 429) {
    const seconds = Number(response.headers.get("Retry-After") ?? "60");
    return messages.login.errors.tooManyAttempts(Math.max(1, Math.ceil(seconds / 60)));
  }
  return messages.login.errors.unexpected;
}

export function LoginPage() {
  const { data: me } = useMe();
  const [params] = useSearchParams();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Prepared early; if it fails here, submitting tries again
    ensureCsrfCookie().catch(() => undefined);
  }, []);

  if (me) {
    return <Navigate to={safeTarget(params.get("sonra"))} replace />;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSubmitting(true);
    setError(null);
    try {
      await ensureCsrfCookie();
      const { response } = await api.POST("/api/admin/auth/login", {
        body: { username: field(form, "username"), password: field(form, "password") },
      });
      if (response.ok) {
        // Loading the session re-renders this page, which then forwards to the requested address
        await queryClient.fetchQuery({ ...meQuery, staleTime: 0 });
        return;
      }
      setError(loginError(response));
    } catch {
      setError(messages.login.errors.unexpected);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <Card className="w-full max-w-sm p-6 sm:p-8">
        <Logo className="mx-auto mb-6 h-24 w-auto" />
        <h1 className="mb-6 text-center text-xl font-semibold">{messages.login.title}</h1>
        <form className="flex flex-col gap-4" onSubmit={(event) => void submit(event)} noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="username">{messages.login.username}</Label>
            <Input id="username" name="username" autoComplete="username" autoCapitalize="none" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">{messages.login.password}</Label>
            <Input id="password" name="password" type="password" autoComplete="current-password" required />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? messages.login.submitting : messages.login.submit}
          </Button>
        </form>
      </Card>
    </main>
  );
}
