"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Link } from "@/i18n/navigation";
import type { Pathname } from "@/i18n/routing";
import { goldButton } from "./buttons";
import { LanguageSwitcher } from "./LanguageSwitcher";

/** The ☰ menu on phones and tablets: full screen, with the languages and the quote button. */
export function MobileMenu({
  items,
  labels,
}: {
  items: { href: Pathname; label: string }[];
  labels: { menu: string; close: string; main: string; quote: string };
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        className="flex min-h-11 min-w-11 items-center justify-center text-ivory lg:hidden"
        aria-label={labels.menu}
      >
        <Menu className="size-6" strokeWidth={1.5} aria-hidden />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Popup className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-night p-6">
          <div className="flex items-center justify-between">
            <Dialog.Title className="eyebrow">{labels.menu}</Dialog.Title>
            <Dialog.Close
              className="flex min-h-11 min-w-11 items-center justify-center text-ivory"
              aria-label={labels.close}
            >
              <X className="size-6" strokeWidth={1.5} aria-hidden />
            </Dialog.Close>
          </div>
          <nav aria-label={labels.main} className="mt-8 flex flex-col">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="border-b border-line py-4 font-heading text-2xl text-ivory hover:text-gold"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-8 flex flex-col gap-6">
            <Link href="/quote" onClick={() => setOpen(false)} className={goldButton}>
              {labels.quote}
            </Link>
            <LanguageSwitcher />
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
