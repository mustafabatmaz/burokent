import { describe, expect, it } from "vitest";
import { contactLines, controllerName, type Company } from "./company";

const known: Company = {
  email: "info@example.com",
  hours: { opens: "08:00", closes: "18:00" },
  legalName: null,
  address: null,
  phone: null,
};

describe("company details", () => {
  it("shows only the details that are known", () => {
    expect(contactLines(known).map((line) => line.kind)).toEqual(["email", "hours"]);
  });

  it("links the e-mail address and the phone number", () => {
    const lines = contactLines({ ...known, phone: "0 (212) 555 00 00", address: "Örnek Mah. 1, İstanbul" });

    expect(lines.map((line) => line.kind)).toEqual(["phone", "email", "address", "hours"]);
    expect(lines.find((line) => line.kind === "phone")?.href).toBe("tel:+902125550000");
    expect(lines.find((line) => line.kind === "email")?.href).toBe("mailto:info@example.com");
    expect(lines.find((line) => line.kind === "address")?.href).toBeUndefined();
    expect(lines.find((line) => line.kind === "hours")?.value).toBe("08:00–18:00");
  });

  it("names the data controller by its legal name once known, by the brand until then", () => {
    expect(controllerName(known, "BüroKent")).toBe("BüroKent");
    expect(controllerName({ ...known, legalName: "Örnek Mobilya Ltd. Şti." }, "BüroKent")).toBe(
      "Örnek Mobilya Ltd. Şti.",
    );
  });
});
