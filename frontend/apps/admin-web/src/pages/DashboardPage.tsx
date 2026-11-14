import { useQuery } from "@tanstack/react-query";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { useSession } from "../auth/session.tsx";
import { Card } from "../components/ui/card.tsx";
import { dashboardQuery, type DashboardView } from "../features/dashboard/queries.ts";
import { WEATHER_ICONS, weatherKind } from "../features/dashboard/weather.ts";
import { messages } from "../messages.ts";

const ZONE = "Europe/Istanbul";
const DATE = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const WEEKDAY = new Intl.DateTimeFormat("tr-TR", { weekday: "long", timeZone: "UTC" });
const TIME = new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: ZONE });
const RATE = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
const LIRA = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const CHANGE = new Intl.NumberFormat("tr-TR", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: "exceptZero",
});

/** A calendar date from the API ("2026-11-13"), shown as is, whatever the browser's time zone. */
function calendarDate(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

function todayInTurkey(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONE }).format(new Date());
}

export function DashboardPage() {
  const me = useSession();
  const dashboard = useQuery(dashboardQuery);
  const d = messages.dashboard;

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">{d.title}</h1>
      <Card className="p-6">
        <p className="font-medium">{d.welcome(me.displayName)}</p>
        <p className="mt-1 text-muted-foreground">{d.empty}</p>
      </Card>
      {dashboard.isPending ? (
        <p role="status" className="text-muted-foreground">
          {messages.loading}
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <RatesCard rates={dashboard.data?.rates} />
          <GoldCard gold={dashboard.data?.gold} configured={dashboard.data?.goldConfigured ?? false} />
          <div className="lg:col-span-2">
            <WeatherCard location={dashboard.data?.location ?? ""} weather={dashboard.data?.weather} />
          </div>
        </div>
      )}
    </section>
  );
}

function RatesCard({ rates }: { rates: DashboardView["rates"] }) {
  const r = messages.dashboard.rates;
  return (
    <Card className="flex flex-col gap-4 p-6">
      {rates ? (
        <>
          <table className="w-full text-sm">
            <caption className="mb-3 text-start text-lg font-semibold">{r.title}</caption>
            <thead>
              <tr className="border-b text-muted-foreground">
                <th scope="col" className="py-2 text-start font-medium">
                  {r.currency}
                </th>
                <th scope="col" className="py-2 text-end font-medium">
                  {r.buying}
                </th>
                <th scope="col" className="py-2 text-end font-medium">
                  {r.selling}
                </th>
              </tr>
            </thead>
            <tbody>
              {rates.rates.map((rate) => (
                <tr key={rate.code} className="border-b last:border-0">
                  <th scope="row" className="py-3 text-start font-medium">
                    {r.currencies[rate.code] ?? rate.code}
                    <span className="ms-2 text-xs text-muted-foreground">{rate.code}</span>
                  </th>
                  <td className="py-3 text-end text-base tabular-nums">{RATE.format(Number(rate.buying))} ₺</td>
                  <td className="py-3 text-end text-base tabular-nums">{RATE.format(Number(rate.selling))} ₺</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-muted-foreground">{r.source(DATE.format(calendarDate(rates.date)))}</p>
        </>
      ) : (
        <>
          <h2 className="text-lg font-semibold">{r.title}</h2>
          <p className="text-muted-foreground">{r.unavailable}</p>
        </>
      )}
    </Card>
  );
}

function GoldCard({ gold, configured }: { gold: DashboardView["gold"]; configured: boolean }) {
  const g = messages.dashboard.gold;
  const perGram = gold ? Number(gold.perGram) : 0;
  const previous = gold?.previousPerGram ? Number(gold.previousPerGram) : undefined;
  const change = previous ? (perGram - previous) / previous : undefined;
  const Trend = change === undefined || change === 0 ? Minus : change > 0 ? TrendingUp : TrendingDown;

  return (
    <Card className="p-6">
      <section aria-label={g.title} className="flex h-full flex-col gap-4">
        <h2 className="text-lg font-semibold">{g.title}</h2>
        {gold ? (
          <>
            <div>
              <p className="text-sm text-muted-foreground">{g.perGram}</p>
              <p className="text-3xl font-semibold tabular-nums">{LIRA.format(perGram)} ₺</p>
              {change !== undefined && previous !== undefined && (
                <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Trend aria-hidden className="size-4" />
                  {g.change(CHANGE.format(change), `${LIRA.format(previous)} ₺`)}
                </p>
              )}
            </div>
            <p className="mt-auto text-xs text-muted-foreground">{g.source(DATE.format(calendarDate(gold.date)))}</p>
          </>
        ) : (
          <p className="text-muted-foreground">{configured ? g.unavailable : g.notConfigured}</p>
        )}
      </section>
    </Card>
  );
}

function WeatherCard({ location, weather }: { location: string; weather: DashboardView["weather"] }) {
  const w = messages.dashboard.weather;
  const title = w.title(location);
  const today = todayInTurkey();

  function dayName(date: string, index: number): string {
    if (date === today) return w.today;
    if (index > 0 && weather?.days[index - 1]?.date === today) return w.tomorrow;
    const name = WEEKDAY.format(calendarDate(date));
    return name.charAt(0).toLocaleUpperCase("tr-TR") + name.slice(1);
  }

  return (
    <Card className="p-6">
      <section aria-label={title} className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        {weather ? (
          <>
            <Now temperature={weather.temperature} symbol={weather.symbol} />
            <ul className="grid grid-cols-3 gap-2">
              {weather.days.map((day, index) => {
                const kind = weatherKind(day.symbol);
                const Icon = WEATHER_ICONS[kind];
                return (
                  <li key={day.date} className="flex flex-col items-center gap-1 rounded-lg bg-muted p-3 text-center">
                    <span className="text-sm font-medium">{dayName(day.date, index)}</span>
                    <Icon aria-hidden className="size-7 text-primary" />
                    <span className="text-xs text-muted-foreground">{w.kinds[kind]}</span>
                    <span className="text-sm tabular-nums">{w.range(Math.round(day.min), Math.round(day.max))}</span>
                  </li>
                );
              })}
            </ul>
            <p className="text-xs text-muted-foreground">
              {w.attribution} · {w.updated(TIME.format(new Date(weather.updatedAt)))}
            </p>
          </>
        ) : (
          <p className="text-muted-foreground">{w.unavailable}</p>
        )}
      </section>
    </Card>
  );
}

function Now({ temperature, symbol }: { temperature: number; symbol: string }) {
  const kind = weatherKind(symbol);
  const Icon = WEATHER_ICONS[kind];
  return (
    <div className="flex items-center gap-4">
      <Icon aria-hidden className="size-12 text-primary" />
      <div>
        <p className="text-sm text-muted-foreground">{messages.dashboard.weather.now}</p>
        <p className="text-3xl font-semibold tabular-nums">{Math.round(temperature)}°</p>
        <p>{messages.dashboard.weather.kinds[kind]}</p>
      </div>
    </div>
  );
}
