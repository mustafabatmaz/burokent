import { ShieldAlert } from "lucide-react";
import { messages } from "../messages.ts";

export function ForbiddenPage() {
  return (
    <section className="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
      <ShieldAlert className="size-10 text-muted-foreground" aria-hidden />
      <h1 className="text-xl font-semibold">{messages.forbidden.title}</h1>
      <p className="text-muted-foreground">{messages.forbidden.description}</p>
    </section>
  );
}
