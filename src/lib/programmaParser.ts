// ============================================================================
// Programma-plakparser — leest een geplakt wedstrijdprogramma (voetbal.nl,
// club-app, of gewoon een lijstje) en haalt er datum + tegenstander uit.
// ----------------------------------------------------------------------------
// Herkent o.a.:
//   "zaterdag 5 september 2026"           (datumregel; geldt voor regels erna)
//   "09:00 Nivo Sparta JO17-2 - Almkerk JO17-1"
//   "05-09-2026 Sleeuwijk JO17-1 - Nivo Sparta JO17-2"
// Regels: een wedstrijdregel bevat twee teamnamen gescheiden door " - "
// (spatie-streep-spatie, zodat "JO17-2" niet als scheiding telt). De datum mag
// op de regel zelf staan of op een eerdere losse datumregel. Numerieke datums
// vereisen een jaartal (dd-mm-jjjj) zodat "17-2" uit teamnamen nooit als datum
// wordt gelezen; bij tekstdatums zonder jaar kiezen we het jaar dat het dichtst
// bij vandaag ligt.
// ============================================================================

const MAANDEN: Record<string, number> = {
  januari: 1, jan: 1,
  februari: 2, feb: 2,
  maart: 3, mrt: 3,
  april: 4, apr: 4,
  mei: 5,
  juni: 6, jun: 6,
  juli: 7, jul: 7,
  augustus: 8, aug: 8,
  september: 9, sep: 9, sept: 9,
  oktober: 10, okt: 10,
  november: 11, nov: 11,
  december: 12, dec: 12,
};

export interface GeplakteWedstrijd {
  datum: string; // YYYY-MM-DD
  tegenstander: string;
  uitslag: string | null; // "3-1" zoals getoond (thuis-uit), indien aanwezig
}

export interface PlakResultaat {
  wedstrijden: GeplakteWedstrijd[];
  zonderDatum: number; // wedstrijdregels waar geen datum bij te vinden was
}

function maakIso(jaar: number, maand: number, dag: number): string | null {
  if (maand < 1 || maand > 12 || dag < 1 || dag > 31) return null;
  const d = new Date(Date.UTC(jaar, maand - 1, dag));
  if (d.getUTCMonth() !== maand - 1 || d.getUTCDate() !== dag) return null;
  return d.toISOString().slice(0, 10);
}

// Zonder jaartal: kies het jaar waarmee de datum het dichtst bij vandaag ligt.
function kiesJaar(maand: number, dag: number, vandaag: Date): number {
  const basis = vandaag.getFullYear();
  let beste = basis;
  let besteAfstand = Infinity;
  for (const j of [basis - 1, basis, basis + 1]) {
    const d = new Date(Date.UTC(j, maand - 1, dag));
    const afstand = Math.abs(d.getTime() - vandaag.getTime());
    if (afstand < besteAfstand) {
      besteAfstand = afstand;
      beste = j;
    }
  }
  return beste;
}

// Zoekt een datum in de regel. Geeft de datum en de regel zonder dat stuk
// terug (zodat teamnamen apart geparset kunnen worden).
function vindDatum(regel: string, vandaag: Date): { datum: string; rest: string } | null {
  // ISO: 2026-09-05
  let m = regel.match(/(?<![\dA-Za-z-])(\d{4})-(\d{2})-(\d{2})(?![\d-])/);
  if (m) {
    const iso = maakIso(Number(m[1]), Number(m[2]), Number(m[3]));
    if (iso) return { datum: iso, rest: regel.replace(m[0], " ") };
  }

  // Numeriek mét jaartal: 05-09-2026 of 5/9/2026. Lookbehind voorkomt dat
  // "JO17-2" of "17-2-1" uit een teamnaam meedoet.
  m = regel.match(/(?<![\dA-Za-z-])(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?![\d-])/);
  if (m) {
    const iso = maakIso(Number(m[3]), Number(m[2]), Number(m[1]));
    if (iso) return { datum: iso, rest: regel.replace(m[0], " ") };
  }

  // Tekstueel: "5 september 2026", "5 sep", "5 sept. 2026"
  m = regel.match(/(?<![\dA-Za-z])(\d{1,2})\s+([a-zA-Z]+)\.?(?:\s+(\d{4}))?/);
  if (m) {
    const maand = MAANDEN[m[2].toLowerCase()];
    if (maand) {
      const dag = Number(m[1]);
      const jaar = m[3] ? Number(m[3]) : kiesJaar(maand, dag, vandaag);
      const iso = maakIso(jaar, maand, dag);
      if (iso) return { datum: iso, rest: regel.replace(m[0], " ") };
    }
  }

  return null;
}

// Splitst een regel in twee teamnamen, of null als het geen wedstrijdregel is.
// Scheiding is " - " (met spaties); beide kanten moeten letters bevatten.
function vindTeams(regel: string): { thuis: string; uit: string } | null {
  const idx = regel.indexOf(" - ");
  if (idx < 0) return null;
  const thuis = regel.slice(0, idx).trim();
  const uit = regel.slice(idx + 3).trim();
  if (!/[A-Za-z]/.test(thuis) || !/[A-Za-z]/.test(uit)) return null;
  return { thuis, uit };
}

// Verwijdert tijden (09:00), weekdagen en los overgebleven leestekens.
function schoonTeamdeel(s: string): string {
  return s
    .replace(/\b\d{1,2}[:.]\d{2}\b/g, " ")
    .replace(/\b(maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag|ma|di|wo|do|vr|za|zo)\b\.?/gi, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s·,;|-]+|[\s·,;|]+$/g, "")
    .trim();
}

// Hint om ons eigen team te herkennen in "Thuis - Uit".
const EIGEN_TEAM_HINT = "nivo";

// Regels die in geplakte programma's voorkomen maar geen teamnaam zijn.
const GEEN_TEAM =
  /^(programma|uitslag(en)?|wedstrijd(en)?|wedstrijdprogramma|poule(\s.+)?|competitie|beker|oefen(wedstrijd)?|vriendschappelijk|\d+e\s+ronde|ronde\s+\d+|thuis|uit|datum|tijd|aanvang|veld(\s\d+)?|sportpark\s.+|accommodatie.*)$/i;

function isTeamnaam(s: string): boolean {
  return s.length >= 2 && /[A-Za-z]/.test(s) && !GEEN_TEAM.test(s);
}

// Een uitslagregel zoals "3 - 1" of "0-0" (op de uitslagen-pagina staat die
// tussen de twee teamnamen, waar in het programma de aanvangstijd staat).
function alsUitslag(s: string): string | null {
  const m = s.match(/^(\d{1,3})\s*[-–]\s*(\d{1,3})$/);
  return m ? `${m[1]}-${m[2]}` : null;
}

export function parsePlakProgramma(tekst: string, vandaag: Date = new Date()): PlakResultaat {
  const wedstrijden: GeplakteWedstrijd[] = [];
  const gezien = new Set<string>();
  let zonderDatum = 0;
  let huidigeDatum: string | null = null;
  // Blok-formaat (voetbal.nl): onder een datumregel staan de teamnamen op losse
  // regels (vaak dubbel, met de tijd of de uitslag ertussen). We verzamelen ze
  // per datum en maken er daarna paren van: thuis, uit.
  let blok: { soort: "team" | "uitslag"; waarde: string }[] = [];

  const voegToe = (datum: string, thuis: string, uit: string, uitslag: string | null) => {
    let tegenstander: string;
    if (thuis.toLowerCase().includes(EIGEN_TEAM_HINT)) {
      tegenstander = uit;
    } else if (uit.toLowerCase().includes(EIGEN_TEAM_HINT)) {
      tegenstander = `${thuis} (uit)`;
    } else {
      tegenstander = `${thuis} - ${uit}`;
    }
    const sleutel = `${datum}|${tegenstander.toLowerCase()}`;
    if (gezien.has(sleutel)) return;
    gezien.add(sleutel);
    wedstrijden.push({ datum, tegenstander, uitslag });
  };

  const sluitBlokAf = () => {
    // Opeenvolgende dubbele teamnamen samenvouwen (voetbal.nl toont elke naam
    // dubbel); uitslagregels blijven op hun plek tussen thuis- en uitteam.
    const uniek: typeof blok = [];
    for (const e of blok) {
      const vorige = uniek[uniek.length - 1];
      if (e.soort === "team" && vorige?.soort === "team" && vorige.waarde === e.waarde) continue;
      uniek.push(e);
    }
    // Lees per wedstrijd: thuisteam, (eventueel uitslag), uitteam.
    let thuis: string | null = null;
    let uitslag: string | null = null;
    for (const e of uniek) {
      if (e.soort === "uitslag") {
        if (thuis) uitslag = e.waarde;
        continue;
      }
      if (!thuis) {
        thuis = e.waarde;
      } else {
        if (huidigeDatum) voegToe(huidigeDatum, thuis, e.waarde, uitslag);
        else zonderDatum++;
        thuis = null;
        uitslag = null;
      }
    }
    blok = [];
  };

  for (const ruweRegel of tekst.split(/\r?\n/)) {
    const regel = ruweRegel.trim();
    if (!regel) continue;

    const datumInRegel = vindDatum(regel, vandaag);
    const teamRegel = datumInRegel ? datumInRegel.rest : regel;
    const teams = vindTeams(teamRegel);

    // Formaat 1: "Thuis - Uit" op één regel (met datum erop of erboven),
    // eventueel met de uitslag erachter ("... - Uit 3-1").
    if (teams) {
      const thuis = schoonTeamdeel(teams.thuis);
      let uitDeel = schoonTeamdeel(teams.uit);
      let uitslag: string | null = null;
      const staart = uitDeel.match(/\s+(\d{1,3}\s*[-–]\s*\d{1,3})$/);
      if (staart) {
        uitslag = alsUitslag(staart[1].trim());
        uitDeel = uitDeel.slice(0, staart.index).trim();
      }
      const datum = datumInRegel?.datum ?? huidigeDatum;
      if (!thuis || !uitDeel) continue;
      if (!datum) {
        zonderDatum++;
        continue;
      }
      voegToe(datum, thuis, uitDeel, uitslag);
      continue;
    }

    // Datumregel: vorige blok afronden en de nieuwe datum onthouden.
    if (datumInRegel) {
      sluitBlokAf();
      huidigeDatum = datumInRegel.datum;
      const rest = schoonTeamdeel(datumInRegel.rest);
      if (isTeamnaam(rest)) blok.push({ soort: "team", waarde: rest });
      continue;
    }

    // Uitslagregel binnen een blok ("3 - 1" tussen de teamnamen).
    const uitslag = alsUitslag(regel);
    if (uitslag) {
      blok.push({ soort: "uitslag", waarde: uitslag });
      continue;
    }

    // Formaat 2 (voetbal.nl-blokken): losse teamnaam-regels verzamelen.
    const schoon = schoonTeamdeel(regel);
    if (isTeamnaam(schoon)) blok.push({ soort: "team", waarde: schoon });
  }
  sluitBlokAf();

  return { wedstrijden, zonderDatum };
}
