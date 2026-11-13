import { useSession } from "../auth/session.tsx";
import { Card } from "../components/ui/card.tsx";
import { messages } from "../messages.ts";

export function DashboardPage() {
  const me = useSession();
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">{messages.dashboard.title}</h1>
      <Card className="p-6">
        <p className="font-medium">{messages.dashboard.welcome(me.displayName)}</p>
        <p className="mt-1 text-muted-foreground">{messages.dashboard.empty}</p>
      </Card>
    </section>
  );
}
