/**
 * Materiaaldienst: elke week twee spelers, alfabetisch op voornaam, doorlopend.
 *
 * Het rooster wordt uitgerekend, niet opgeslagen. Alleen wat de staf aanraakt
 * staat in de database: een afgevinkte week, een vakantieweek, of een
 * handmatig gekozen duo. Zo'n week ligt vast; vanaf daar telt het rooster
 * gewoon verder. Valt een speler af, dan schuift de rest netjes aan.
 */

/** De maandag van de eerste week met materiaaldienst (training di 1 september 2026). */
export const START_WEEK = "2026-08-31";
/** Tot en met deze week wordt het rooster getoond. */
export const EIND_WEEK = "2027-06-28";

export const TAKEN = [
  "De materialen naar het veld brengen: pionnen, hesjes, doeltjes en ballen.",
  "De hesjes en ballen tellen, voor en na de training.",
  "De warming-up klaarzetten.",
  "De ballen oppompen vóór de training.",
  "De bidons en de waterzak vullen.",
  "Na de training alles weer opruimen en terugzetten.",
] as const;

/** Op wedstrijddagen is de rust niet voor het duo van de week. */
export const WEDSTRIJD_NOTITIE = "Op wedstrijddagen zorgen de wisselspelers in de rust voor de spullen.";

export interface DienstSpeler {
  id: string;
  naam: string;
}

/** Een rij uit materiaaldienst_weken. */
export interface WeekRij {
  week_start: string;
  speler_a: string | null;
  speler_b: string | null;
  vakantie: boolean;
  gedaan: boolean;
  handmatig: boolean;
}

export interface DienstWeek {
  week_start: string;
  /** null bij een vakantieweek of als er geen spelers zijn. */
  duo: [DienstSpeler, DienstSpeler] | null;
  vakantie: boolean;
  gedaan: boolean;
  handmatig: boolean;
  /** Staat deze week in de database (aangeraakt) of is hij uitgerekend? */
  bewaard: boolean;
}

export function voornaam(naam: string) {
  return naam.trim().split(/\s+/)[0] ?? naam;
}

/** Sortering op voornaam, dan op de rest van de naam. */
export function sorteerSpelers<T extends DienstSpeler>(spelers: T[]): T[] {
  return [...spelers].sort((a, b) => a.naam.localeCompare(b.naam, "nl", { sensitivity: "base" }));
}

export function schuifWeek(weekStart: string, weken: number) {
  const d = new Date(weekStart + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + weken * 7);
  return d.toISOString().slice(0, 10);
}

/** De maandag van de week waarin een datum valt. */
export function maandagVan(datum: string) {
  const d = new Date(datum + "T00:00:00Z");
  const dag = d.getUTCDay(); // 0 = zondag
  d.setUTCDate(d.getUTCDate() - ((dag + 6) % 7));
  return d.toISOString().slice(0, 10);
}

const MAANDEN = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

export function weekLabel(weekStart: string) {
  const d = new Date(weekStart + "T00:00:00Z");
  return `ma ${d.getUTCDate()} ${MAANDEN[d.getUTCMonth()]}`;
}

/** De trainingen op dinsdag en donderdag en de wedstrijd op zaterdag, als "di 1 · do 3 · za 5 sep". */
export function trainingsdagen(weekStart: string) {
  const d = new Date(weekStart + "T00:00:00Z");
  const dag = (plus: number) => { const x = new Date(d); x.setUTCDate(d.getUTCDate() + plus); return x; };
  const [di, dO, za] = [dag(1), dag(3), dag(5)];
  const nr = (x: Date) => x.getUTCDate();
  return `di ${nr(di)} · do ${nr(dO)} · za ${nr(za)} ${MAANDEN[za.getUTCMonth()]}`;
}

/**
 * Rekent het rooster uit. Aangeraakte weken (rijen) liggen vast; de rest
 * volgt de alfabetische volgorde, en telt verder vanaf de laatste vaste week
 * met spelers. Vakantieweken slaan we over zonder de volgorde te breken.
 */
export function bouwRooster(spelers: DienstSpeler[], rijen: WeekRij[], start = START_WEEK, eind = EIND_WEEK): DienstWeek[] {
  const lijst = sorteerSpelers(spelers);
  const n = lijst.length;
  const perWeek = new Map(rijen.map((r) => [r.week_start, r]));
  const index = new Map(lijst.map((s, i) => [s.id, i]));
  const zoek = (id: string | null) => (id ? lijst.find((s) => s.id === id) ?? null : null);

  const weken: DienstWeek[] = [];
  let wijzer = 0;
  for (let week = start; week <= eind; week = schuifWeek(week, 1)) {
    const rij = perWeek.get(week);
    if (rij && (rij.vakantie || rij.handmatig || rij.gedaan)) {
      const a = zoek(rij.speler_a);
      const b = zoek(rij.speler_b);
      const duo: [DienstSpeler, DienstSpeler] | null = !rij.vakantie && a && b ? [a, b] : null;
      weken.push({ week_start: week, duo, vakantie: rij.vakantie, gedaan: rij.gedaan, handmatig: rij.handmatig, bewaard: true });
      // Verder tellen na het laatste duo dat vastligt.
      if (duo) {
        const ib = index.get(b!.id);
        const ia = index.get(a!.id);
        wijzer = ib !== undefined ? (ib + 1) % n : ia !== undefined ? (ia + 2) % n : wijzer;
      }
      continue;
    }
    if (n === 0) {
      weken.push({ week_start: week, duo: null, vakantie: false, gedaan: false, handmatig: false, bewaard: false });
      continue;
    }
    const a = lijst[wijzer % n];
    const b = lijst[(wijzer + 1) % n];
    wijzer = (wijzer + 2) % n;
    weken.push({ week_start: week, duo: [a, b], vakantie: false, gedaan: false, handmatig: false, bewaard: !!rij });
  }
  return weken;
}
