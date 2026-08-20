import { esPY, type Dictionary } from "./es-PY";
import { svSE } from "./sv-SE";
import { deepMerge } from "./merge";
import type { AppLocale } from "@/db/schema";

export type { Dictionary };
export const DEFAULT_LOCALE: AppLocale = "es-PY";
export const SUPPORTED_LOCALES: AppLocale[] = ["es-PY", "sv-SE"];

const dictionaries: Record<AppLocale, Dictionary> = {
  "es-PY": esPY,
  "sv-SE": deepMerge(esPY as Dictionary, svSE),
};

/** The only way components get UI text. Never hardcode a string in a component. */
export function getDictionary(locale: AppLocale = DEFAULT_LOCALE): Dictionary {
  return dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
}

export function formatDate(date: Date, locale: AppLocale = DEFAULT_LOCALE) {
  const d = getDictionary(locale).meta;
  return new Intl.DateTimeFormat(d.localeTag, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: d.timeZone,
  }).format(date);
}

export function formatDateTime(date: Date, locale: AppLocale = DEFAULT_LOCALE) {
  const d = getDictionary(locale).meta;
  return new Intl.DateTimeFormat(d.localeTag, {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: d.timeZone,
  }).format(date);
}

export function formatNumber(value: number, locale: AppLocale = DEFAULT_LOCALE) {
  return new Intl.NumberFormat(getDictionary(locale).meta.localeTag).format(value);
}

/** Day key (YYYY-MM-DD) in the tenant's timezone, for bucketing scans. */
export function localDayKey(date: Date, locale: AppLocale = DEFAULT_LOCALE) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: getDictionary(locale).meta.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  return parts;
}
