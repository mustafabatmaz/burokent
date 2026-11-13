import type { routing } from "@/i18n/routing";
import type messages from "../messages/tr.json";

// Typed translations: a key missing from tr.json is a compile error
declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof messages;
  }
}
