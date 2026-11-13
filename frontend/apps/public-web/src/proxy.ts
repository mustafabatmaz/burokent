import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Runs before routing. Addresses with a language pass through; "/" and addresses without one get a language:
// the NEXT_LOCALE cookie, then the browser's Accept-Language, then Turkish.
export const proxy = createMiddleware(routing);

export const config = {
  // Not for the API, Next's own files or anything with a file extension (icons, images, robots.txt)
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
