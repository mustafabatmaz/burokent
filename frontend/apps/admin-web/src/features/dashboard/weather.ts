import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudRainWind,
  CloudSnow,
  CloudSun,
  HelpCircle,
  Moon,
  Sun,
  type LucideIcon,
} from "lucide-react";
import type { messages } from "../../messages.ts";

export type WeatherKind = keyof typeof messages.dashboard.weather.kinds;

/**
 * MET Norway's symbol codes ("partlycloudy_day", "heavyrainshowersandthunder_night"…) grouped into the few kinds the
 * panel names. The strongest part wins: thunder before snow, snow before rain.
 */
export function weatherKind(code: string): WeatherKind {
  const [base = "", time] = code.split("_");
  if (base.includes("thunder")) return "thunder";
  if (base.includes("snow")) return "snow";
  if (base.includes("sleet")) return "sleet";
  if (base.includes("showers")) return "showers";
  if (base.startsWith("heavyrain")) return "heavyRain";
  if (base.startsWith("lightrain")) return "lightRain";
  if (base === "rain") return "rain";
  if (base === "fog") return "fog";
  if (base === "cloudy") return "cloudy";
  if (base === "partlycloudy") return "partlyCloudy";
  if (base === "fair") return "fair";
  if (base === "clearsky") return time === "night" ? "clearNight" : "clear";
  return "unknown";
}

export const WEATHER_ICONS: Record<WeatherKind, LucideIcon> = {
  clear: Sun,
  clearNight: Moon,
  fair: CloudSun,
  partlyCloudy: CloudSun,
  cloudy: Cloud,
  fog: CloudFog,
  lightRain: CloudDrizzle,
  rain: CloudRain,
  heavyRain: CloudRainWind,
  showers: CloudRain,
  thunder: CloudLightning,
  sleet: CloudSnow,
  snow: CloudSnow,
  unknown: HelpCircle,
};
