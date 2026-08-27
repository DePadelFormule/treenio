// Gestructureerde vorm van een gegenereerde les. Dit schema geven we mee aan de
// Claude-aanroep (structured outputs) zodat het antwoord altijd deze vorm heeft.

export type Sport = "voetbal" | "padel";

export interface LesBlok {
  naam: string;
  type: string; // warming-up | theorie | aanspeelvorm | oefenvorm | rallyvorm | wedstrijdvorm | cooling-down
  duur_minuten: number;
  doel: string;
  organisatie: string; // teken-recept; begint met "Tekening:" bij oefen-/rally-/wedstrijdblokken
  coachpunten: string[];
  progressie_makkelijker: string;
  progressie_moeilijker: string;
  // Handgetekende oefening op het halve veld (data-URL, PNG). Alleen gezet bij
  // het digitale lesformulier — de AI genereert dit niet, dus niet in het
  // JSON-schema hieronder.
  tekening?: string;
  // Coachpunten per doelgroep en variaties op de vorm. Ook alleen van het
  // digitale lesformulier, niet in het AI-schema.
  coaching_verdedigers?: string;
  coaching_aanvallers?: string;
  variaties?: string;
}

export interface Leeskaart {
  focuspunten: string[];
  veelgemaakte_fouten: string[];
  huiswerk: string[];
}

export interface Les {
  titel: string;
  sport: Sport;
  onderwerp: string;
  fase: number;
  niveau: string;
  totale_duur_minuten: number;
  aantal_spelers: number;
  materiaal: string;
  blokken: LesBlok[];
  leeskaart: Leeskaart;
}

// JSON Schema voor structured outputs. Alle objecten hebben
// additionalProperties:false en een volledige required-lijst (eis van de API).
export const LES_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    titel: { type: "string" },
    sport: { type: "string", enum: ["voetbal", "padel"] },
    onderwerp: { type: "string" },
    fase: { type: "integer" },
    niveau: { type: "string" },
    totale_duur_minuten: { type: "integer" },
    aantal_spelers: { type: "integer" },
    materiaal: { type: "string" },
    blokken: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          naam: { type: "string" },
          type: { type: "string" },
          duur_minuten: { type: "integer" },
          doel: { type: "string" },
          organisatie: { type: "string" },
          coachpunten: { type: "array", items: { type: "string" } },
          progressie_makkelijker: { type: "string" },
          progressie_moeilijker: { type: "string" },
        },
        required: [
          "naam",
          "type",
          "duur_minuten",
          "doel",
          "organisatie",
          "coachpunten",
          "progressie_makkelijker",
          "progressie_moeilijker",
        ],
      },
    },
    leeskaart: {
      type: "object",
      additionalProperties: false,
      properties: {
        focuspunten: { type: "array", items: { type: "string" } },
        veelgemaakte_fouten: { type: "array", items: { type: "string" } },
        huiswerk: { type: "array", items: { type: "string" } },
      },
      required: ["focuspunten", "veelgemaakte_fouten", "huiswerk"],
    },
  },
  required: [
    "titel",
    "sport",
    "onderwerp",
    "fase",
    "niveau",
    "totale_duur_minuten",
    "aantal_spelers",
    "materiaal",
    "blokken",
    "leeskaart",
  ],
} as const;
