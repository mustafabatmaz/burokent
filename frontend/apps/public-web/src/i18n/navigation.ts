import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// Next's Link, redirect and hooks, aware of the language prefix and the translated addresses
export const { Link, redirect, permanentRedirect, usePathname, useRouter, getPathname } = createNavigation(routing);
