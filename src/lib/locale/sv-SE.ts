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
    or: "eller",
    optional: "frivilligt",
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
    feedback: "Feedback",
  },
  editor: {
    ctaDefault: "Betygsätt oss på Google",
    footerDefault: "Skanna med mobilkameran",
    mode: "Vad som händer vid skanning",
    modeHint: "Samma tryckta QR i båda fallen — du kan byta när du vill.",
    modes: {
      direct: "Gå direkt till Google",
      rating_gate: "Visa en mellansida",
    },
    modeDirectHint: "Skanningen skickar kunden direkt till din recensionssida.",
    modeGateHint:
      "Före Google visas en sida där kunden kan sätta betyg och, om hen vill, lämna privat feedback. Båda alternativen syns alltid, oavsett antal stjärnor.",
    modeCompliance:
      "Vi döljer aldrig Google-länken utifrån betyget: att filtrera fram nöjda kunder bryter mot Googles recensionspolicy.",
  },

  // The interstitial is the one page a real customer sees — it gets a full translation,
  // never an es-PY fallback.
  gate: {
    title: "Hur var ditt besök?",
    subtitle: "Din åsikt hjälper oss att bli bättre. Välj det du föredrar — båda vägarna är öppna.",
    ratingLabel: "Ditt betyg",
    ratingOptional: "Frivilligt",
    stars: {
      "1": "1 stjärna",
      "2": "2 stjärnor",
      "3": "3 stjärnor",
      "4": "4 stjärnor",
      "5": "5 stjärnor",
    },
    googleCta: "Lämna en recension på Google",
    googleHint: "Öppnar din Google-sida. Alla recensioner är välkomna.",
    privateCta: "Skriv till oss privat",
    privateHint: "Går bara till företaget och publiceras ingenstans.",
    messageLabel: "Din feedback",
    messagePlaceholder: "Berätta vad du tyckte…",
    contactLabel: "Din e-post eller ditt telefonnummer",
    contactHint: "Bara om du vill ha svar.",
    send: "Skicka feedback",
    privacy:
      "Vi sparar det du skriver och kontaktuppgiften du lämnar så att företaget kan svara dig. Vi sparar varken din IP-adress eller din plats.",
    thanksTitle: "Tack!",
    thanksBody: "Vi har tagit emot din feedback och företaget kommer att läsa den.",
    thanksGoogle: "Vill du kan du också lämna en publik recension på Google.",
    errorEmpty: "Skriv något innan du skickar.",
    errorTooFast: "Vänta ett ögonblick innan du skickar.",
    errorExpired: "Sidan har varit öppen för länge. Ladda om och försök igen.",
    errorRateLimited: "Vi har redan tagit emot flera meddelanden härifrån. Försök senare.",
  },

  stats: {
    feedbackTitle: "Privat feedback",
    feedbackTotal: "Mottagna meddelanden",
    avgRating: "Snittbetyg",
    ratedCount: "Med betyg",
    responseRate: "Skanningar som lämnade meddelande",
    ratingBreakdown: "Fördelning av stjärnor",
    noFeedback: "Ingen har lämnat privat feedback på det här kortet än.",
    openInbox: "Visa all feedback",
  },

  feedback: {
    title: "Privat feedback",
    subtitle:
      "Det dina kunder skrivit till dig från mellansidan. Publiceras ingenstans.",
    empty: "Du har inte fått någon privat feedback än.",
    emptyHint:
      "Den dyker upp här när ett kort använder mellansidan och en kund skriver till dig.",
    newCount: "Olästa",
    rating: "Betyg",
    noRating: "Utan betyg",
    contact: "Kontakt",
    card: "Kort",
    received: "Mottaget",
    markRead: "Markera som läst",
    markNew: "Markera som oläst",
    archive: "Arkivera",
    unarchive: "Avarkivera",
    delete: "Ta bort",
    filterAll: "Alla",
    filterNew: "Olästa",
    filterArchived: "Arkiverade",
    retentionNote:
      "Meddelandena innehåller personuppgifter som kunden lämnat. Ta bort dem du inte längre behöver.",
  },
};
