import { describe, expect, it } from "vitest";
import { weatherKind } from "./weather.ts";

describe("weather codes", () => {
  it.each([
    ["clearsky_day", "clear"],
    ["clearsky_night", "clearNight"],
    ["fair_day", "fair"],
    ["partlycloudy_night", "partlyCloudy"],
    ["cloudy", "cloudy"],
    ["fog", "fog"],
    ["lightrain", "lightRain"],
    ["rain", "rain"],
    ["heavyrain", "heavyRain"],
    ["rainshowers_day", "showers"],
    ["heavyrainshowersandthunder_day", "thunder"],
    ["lightsleet", "sleet"],
    ["snowshowers_night", "snow"],
    ["something_new", "unknown"],
  ])("%s is %s", (code, kind) => {
    expect(weatherKind(code)).toBe(kind);
  });
});
