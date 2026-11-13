import { Link } from "react-router";
import { buttonVariants } from "../components/ui/button.tsx";
import { messages } from "../messages.ts";

export function NotFoundPage() {
  return (
    <section className="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
      <p className="text-5xl font-semibold text-muted-foreground">404</p>
      <h1 className="text-xl font-semibold">{messages.notFound.title}</h1>
      <p className="text-muted-foreground">{messages.notFound.description}</p>
      <Link to="/" className={buttonVariants({ variant: "secondary" })}>
        {messages.notFound.back}
      </Link>
    </section>
  );
}
