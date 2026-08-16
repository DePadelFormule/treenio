// Seizoensstart-vragenlijst voor spelers. Eén definitie die zowel het
// (publieke) invulformulier als de weergave op de spelerskaart aanstuurt.
// De antwoorden worden opgeslagen als { [vraagId]: tekst }.

import { POSITIE_CODES } from "@/lib/constants";

export type VraagType = "kort" | "lang" | "keuze" | "positie";

export interface Vraag {
  id: string;
  blok: string;
  tekst: string;
  type: VraagType;
  opties?: string[]; // bij type "keuze"
  optioneel?: boolean;
  hint?: string;
}

export const VRAGENLIJST_INTRO =
  "Met deze vragenlijst bereiden wij als trainers het seizoen goed voor. " +
  "Vul hem eerlijk in — er zijn geen foute antwoorden. " +
  "Let op: aan je antwoorden kunnen geen rechten worden ontleend; ze zijn input " +
  "voor de trainers, geen beloftes over bijvoorbeeld speeltijd, positie of teamindeling.";

const B1 = "Jij & het seizoen";
const B2 = "Positie & rol";
const B3 = "Wat heb jij nodig";
const B4 = "Gezondheid & thuisfront";
const B5 = "Tot slot";

export const VRAGENLIJST: Vraag[] = [
  // Blok 1 — Jij & het seizoen
  { id: "doel_seizoen", blok: B1, tekst: "Wat is je persoonlijke doel voor dit seizoen?", type: "lang" },
  { id: "sterke_punten", blok: B1, tekst: "Wat zijn je 3 sterkste punten?", type: "lang", hint: "Noem er drie." },
  { id: "verbeterpunten", blok: B1, tekst: "Aan welke 3 punten wil je dit seizoen werken?", type: "lang", hint: "Noem er drie." },
  { id: "teamdoel", blok: B1, tekst: "Wat wil je met het team bereiken?", type: "lang" },
  { id: "geslaagd_seizoen", blok: B1, tekst: "Wat is voor jou een geslaagd seizoen?", type: "lang" },
  { id: "droom", blok: B1, tekst: "Lange termijn: wat is je droom? Wat wil je in de toekomst bereiken met voetbal?", type: "lang" },

  // Blok 2 — Positie & rol
  { id: "positie_1", blok: B2, tekst: "Op welke positie speel je het liefst?", type: "positie" },
  { id: "positie_2", blok: B2, tekst: "Wat is je tweede voorkeur?", type: "positie" },
  { id: "positie_proberen", blok: B2, tekst: "Welke positie zou je weleens willen proberen?", type: "positie", optioneel: true },
  { id: "keepen", blok: B2, tekst: "Keepen?", type: "keuze", opties: ["Ik wil keepen", "Een halve wedstrijd per keer", "Liever niet"] },
  { id: "aanvoerder", blok: B2, tekst: "Wie zou volgens jou aanvoerder moeten zijn? (je mag niet jezelf kiezen)", type: "kort" },

  // Blok 3 — Wat heb jij nodig
  { id: "verwacht_trainingen", blok: B3, tekst: "Wat verwacht je dit seizoen van de trainers tijdens trainingen?", type: "lang" },
  { id: "verwacht_wedstrijden", blok: B3, tekst: "Wat verwacht je dit seizoen van de trainers tijdens wedstrijden?", type: "lang" },
  { id: "meer_aandacht", blok: B3, tekst: "Waar zou je meer tijd en aandacht aan willen besteden tijdens trainingen?", type: "lang" },
  { id: "feedback", blok: B3, tekst: "Hoe krijg je het liefst feedback?", type: "keuze", opties: ["Even apart", "Gewoon in de groep"] },
  { id: "plezier", blok: B3, tekst: "Waar haal jij het meeste plezier uit op de training?", type: "lang" },

  // Blok 4 — Gezondheid & thuisfront
  { id: "bijzonderheden", blok: B4, tekst: "Is er iets dat de trainers moeten weten (blessures, medisch, of iets anders)?", type: "lang", optioneel: true },
  { id: "noodnummer", blok: B4, tekst: "Telefoonnummer van een ouder/verzorger (voor noodgevallen bij uitwedstrijden)", type: "kort" },
  { id: "rijden", blok: B4, tekst: "Kunnen je ouders rijden bij uitwedstrijden?", type: "keuze", opties: ["Ja", "Soms", "Nee"] },
  { id: "vlaggen_ouders", blok: B4, tekst: "Willen je ouders weleens vlaggen?", type: "keuze", opties: ["Ja", "Misschien", "Nee"] },
  { id: "vlaggen_zelf", blok: B4, tekst: "Zou je zelf willen vlaggen, bijvoorbeeld bij een jeugdwedstrijd of onze eigen wedstrijd?", type: "keuze", opties: ["Ja", "Misschien", "Nee"] },

  // Blok 5 — Tot slot
  { id: "opmerkingen", blok: B5, tekst: "Overige opmerkingen", type: "lang", optioneel: true },
];

export const VRAGENLIJST_BLOKKEN = [B1, B2, B3, B4, B5];

export const POSITIE_OPTIES = POSITIE_CODES as readonly string[];
