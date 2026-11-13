import { describe, expect, it } from "vitest";
import ar from "../../messages/ar.json";
import en from "../../messages/en.json";
import tr from "../../messages/tr.json";

// Every key path of a messages object with its value, e.g. ["nav.collection", "Koleksiyon"]
function entries(value: object, prefix = ""): [string, unknown][] {
  return Object.entries(value).flatMap(([key, child]: [string, unknown]) =>
    typeof child === "object" && child !== null ? entries(child, `${prefix}${key}.`) : [[`${prefix}${key}`, child]],
  );
}

const keys = (messages: object) =>
  entries(messages)
    .map(([key]) => key)
    .sort();

describe("messages", () => {
  it("have the same keys in Turkish, English and Arabic", () => {
    expect(keys(en)).toEqual(keys(tr));
    expect(keys(ar)).toEqual(keys(tr));
  });

  it.each([
    ["tr", tr],
    ["en", en],
    ["ar", ar],
  ])("has no empty texts in %s", (_locale, messages) => {
    const empty = entries(messages).filter(([, value]) => typeof value !== "string" || value.trim() === "");
    expect(empty).toEqual([]);
  });
});
