import type { DeepPartial } from "./merge";
import type { Dictionary } from "./es-PY";

/**
 * sv-SE (du-form). v1 ships Paraguay-first, so this locale is intentionally partial:
 * anything missing here falls back to the es-PY entry (see ./index.ts). It exists now
 * so no component ever hardcodes a string — filling it in is a translation pass, not a
 * refactor.
 */
export const svSE: DeepPartial<Dictionary> = {
  meta: {
    localeTag: "sv-SE",
    timeZone: "Europe/Stockholm",
    dateFormat: "yyyy-MM-dd",
  },
  brand: {
    name: "Mina Recensioner",
    tagline: "QR-kort som tar kunden rakt till din Google-recension.",
  },
  common: {
    save: "Spara",
    saving: "Sparar…",
    saved: "Sparat",
    cancel: "Avbryt",
    create: "Skapa",
    edit: "Redigera",
    delete: "Ta bort",
    back: "Tillbaka",
    loading: "Laddar…",
  },
  auth: {
    loginTitle: "Logga in",
    login: "Logga in",
    logout: "Logga ut",
    email: "E-post",
    password: "Lösenord",
    register: "Skapa konto",
  },
  nav: {
    dashboard: "Översikt",
    cards: "Kort",
    businesses: "Företag",
    stats: "Statistik",
  },
  editor: {
    ctaDefault: "Betygsätt oss på Google",
    footerDefault: "Skanna med mobilkameran",
  },
};
