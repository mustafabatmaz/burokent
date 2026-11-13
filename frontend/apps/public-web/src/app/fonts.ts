import { Amiri, Cairo, Cinzel, Playfair_Display } from "next/font/google";

// Downloaded at build time and served from this site: visitors never contact Google.
// latin-ext carries ğ, ş, ı and İ; arabic is needed for the Arabic pages.
export const playfair = Playfair_Display({
  subsets: ["latin", "latin-ext"],
  weight: ["500"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
  display: "swap",
});

export const amiri = Amiri({
  subsets: ["arabic", "latin"],
  weight: ["700"],
  variable: "--font-amiri",
  display: "swap",
});

export const cairo = Cairo({
  subsets: ["arabic", "latin", "latin-ext"],
  weight: ["400", "600"],
  variable: "--font-cairo",
  display: "swap",
});

export const cinzel = Cinzel({
  subsets: ["latin", "latin-ext"],
  weight: ["600"],
  variable: "--font-cinzel",
  display: "swap",
});
