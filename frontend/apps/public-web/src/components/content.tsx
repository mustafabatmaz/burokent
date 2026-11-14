import type { ReactNode } from "react";
import { goldButton, outlineButton } from "@/components/buttons";
import { Link } from "@/i18n/navigation";
import type { Pathname } from "@/i18n/routing";

// Building blocks of the content pages: one width and rhythm for all, square corners, no shadows (design guide §4–5)

const container = "mx-auto max-w-7xl px-4 md:px-6 lg:px-10";

const tones = {
  night: "bg-night",
  raised: "bg-night-raised",
  emerald: "bg-emerald",
} as const;

export interface Item {
  title: string;
  text: string;
}

export function PageIntro({ eyebrow, title, lead }: { eyebrow: string; title: string; lead: string }) {
  return (
    <header className={`${container} flex flex-col items-start gap-5 py-16 md:py-24`}>
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="max-w-4xl text-[clamp(40px,5vw,64px)]">{title}</h1>
      <p className="max-w-prose text-lg text-sand">{lead}</p>
    </header>
  );
}

/** A full-width band with a heading; the heading names the section for screen readers. */
export function Section({
  id,
  title,
  intro,
  tone = "night",
  children,
}: {
  id: string;
  title: string;
  intro?: string;
  tone?: keyof typeof tones;
  children?: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={`${tones[tone]} border-t border-line`}>
      <div className={`${container} flex flex-col gap-8 py-16 md:py-24`}>
        <div className="flex max-w-prose flex-col gap-4">
          <h2 id={`${id}-title`} className="text-[clamp(30px,3.4vw,41px)]">
            {title}
          </h2>
          {intro && <p className="text-sand">{intro}</p>}
        </div>
        {children}
      </div>
    </section>
  );
}

export function Cards({ items }: { items: Item[] }) {
  return (
    <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <li key={item.title} className="flex flex-col gap-3 border border-line p-6">
          <span aria-hidden className="h-px w-10 bg-gold" />
          <h3 className="text-2xl">{item.title}</h3>
          <p className="text-sand">{item.text}</p>
        </li>
      ))}
    </ul>
  );
}

/** Numbered steps of a process, named by the section heading. */
export function Steps({ labelledBy, items }: { labelledBy: string; items: Item[] }) {
  return (
    <ol
      aria-labelledby={labelledBy}
      className="grid gap-6 md:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(200px,1fr))]"
    >
      {items.map((item, index) => (
        <li key={item.title} className="flex flex-col gap-3 border-t border-gold pt-5">
          <span className="font-label text-sm text-gold tabular-nums" aria-hidden>
            {String(index + 1).padStart(2, "0")}
          </span>
          <h3 className="text-xl">{item.title}</h3>
          <p className="text-sand">{item.text}</p>
        </li>
      ))}
    </ol>
  );
}

export function CallToAction({
  id,
  title,
  text,
  primary,
  secondary,
}: {
  id: string;
  title: string;
  text: string;
  primary: { href: Pathname; label: string };
  secondary?: { href: Pathname; label: string };
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="border-t border-line bg-night-raised">
      <div className={`${container} flex flex-col items-start gap-5 py-16 md:py-20`}>
        <h2 id={`${id}-title`} className="text-[clamp(30px,3.4vw,41px)]">
          {title}
        </h2>
        <p className="max-w-prose text-sand">{text}</p>
        <div className="flex flex-wrap gap-3">
          <Link href={primary.href} className={goldButton}>
            {primary.label}
          </Link>
          {secondary && (
            <Link href={secondary.href} className={outlineButton}>
              {secondary.label}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

/** Long legal text: readable width, numbered headings in the document's own order. */
export function LegalDocument({
  title,
  lead,
  updated,
  children,
}: {
  title: string;
  lead: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <article className={`${container} flex flex-col gap-10 py-16 md:py-24`}>
      <header className="flex max-w-prose flex-col gap-4">
        <h1 className="text-[clamp(36px,4.4vw,52px)]">{title}</h1>
        <p className="text-lg text-sand">{lead}</p>
        <p className="text-sm text-sand">{updated}</p>
      </header>
      <div className="flex max-w-prose flex-col gap-10">{children}</div>
    </article>
  );
}

export function LegalSection({
  id,
  title,
  text,
  items,
  note,
  children,
}: {
  id: string;
  title: string;
  text?: ReactNode;
  items?: string[];
  note?: string;
  children?: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="flex flex-col gap-3">
      <h2 id={`${id}-title`} className="text-2xl md:text-3xl">
        {title}
      </h2>
      {text && <p className="text-sand">{text}</p>}
      {items && (
        <ul className="flex list-disc flex-col gap-2 ps-5 text-sand marker:text-gold">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
      {note && <p className="text-sand">{note}</p>}
      {children}
    </section>
  );
}

/** A date in the page's language, Arabic with Western digits (design decision). */
export function formatDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-u-nu-latn" : locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Istanbul",
  }).format(new Date(`${iso}T12:00:00Z`));
}
