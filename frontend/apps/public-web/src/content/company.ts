/**
 * The firm's contact details, in one place for every page. A detail that isn't known yet is null and is not shown
 * at all. Later the admin panel manages these.
 */
export interface Company {
  email: string;
  hours: { opens: string; closes: string };
  /** The full trade name, as the data controller in the privacy notice. */
  legalName: string | null;
  address: string | null;
  /** The landline, as written on the site. */
  phone: string | null;
}

export const COMPANY: Company = {
  email: "info@burokent.com",
  hours: { opens: "08:00", closes: "18:00" },
  legalName: null,
  address: null,
  phone: null,
};

/** When the privacy notice and the cookie policy were last changed. */
export const LEGAL_UPDATED = "2026-11-14";

export interface ContactLine {
  kind: "phone" | "email" | "address" | "hours";
  value: string;
  href?: string;
}

/** The known details in the order a visitor looks for them. */
export function contactLines(company: Company): ContactLine[] {
  const lines: ContactLine[] = [];
  if (company.phone) {
    lines.push({ kind: "phone", value: company.phone, href: `tel:${internationalPhone(company.phone)}` });
  }
  lines.push({ kind: "email", value: company.email, href: `mailto:${company.email}` });
  if (company.address) {
    lines.push({ kind: "address", value: company.address });
  }
  lines.push({ kind: "hours", value: `${company.hours.opens}–${company.hours.closes}` });
  return lines;
}

export function controllerName(company: Company, brand: string): string {
  return company.legalName ?? brand;
}

/** A Turkish number written for people ("0 (212) 555 00 00") as a dialable one ("+902125550000"). */
function internationalPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return `+90${digits.startsWith("0") ? digits.slice(1) : digits}`;
}
