// ============================================================================
// KNVB Dataservice — wedstrijdprogramma ophalen (voetbal.nl / Sportlink)
// ----------------------------------------------------------------------------
// Officiële route: de club heeft een Club.Dataservice-abonnement en krijgt een
// endpoint-URL + key. We halen ALLEEN het programma op (datum, tegenstander,
// uitslag) en zetten dat in de wedstrijden-tabel. Geen spelers/persoonsdata.
//
// Omdat de exacte JSON-veldnamen pas met de echte key zichtbaar zijn, is de
// mapping bewust DEFENSIEF: ze probeert meerdere waarschijnlijke veldnamen.
// Finetunen zodra de eerste echte respons binnen is = één plek aanpassen
// (mapNaarWedstrijd hieronder).
// ============================================================================

export interface KnvbConfig {
  url: string; // volledige endpoint-URL incl. eventueel pad/key zoals de club die krijgt
  teamCode?: string; // optioneel: filter op team/elftal
}

export interface ProgrammaWedstrijd {
  bron_id: string | null;
  datum: string; // YYYY-MM-DD
  tegenstander: string;
  uitslag: string | null;
}

// null = nog niet geconfigureerd (geen KNVB_PROGRAMMA_URL gezet).
export function leesKnvbConfig(): KnvbConfig | null {
  const url = process.env.KNVB_PROGRAMMA_URL;
  if (!url) return null;
  return { url, teamCode: process.env.KNVB_TEAM_CODE || undefined };
}

// Probeer achtereenvolgens een aantal mogelijke sleutels uit een ruwe rij.
function veld(rij: Record<string, unknown>, namen: string[]): string | null {
  for (const n of namen) {
    const v = rij[n];
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      return String(v).trim();
    }
  }
  return null;
}

// Normaliseer een datum-string naar YYYY-MM-DD (best effort).
function normaliseerDatum(raw: string | null): string | null {
  if (!raw) return null;
  // Al ISO?
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  // dd-mm-jjjj of dd/mm/jjjj
  const nl = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (nl) {
    const dd = nl[1].padStart(2, "0");
    const mm = nl[2].padStart(2, "0");
    return `${nl[3]}-${mm}-${dd}`;
  }
  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

// Zet één ruwe KNVB-rij om naar onze ProgrammaWedstrijd, of null als het niet
// als wedstrijd te lezen is. Past de tegenstander aan o.b.v. thuis/uit.
export function mapNaarWedstrijd(
  rij: Record<string, unknown>,
  teamCode?: string,
): ProgrammaWedstrijd | null {
  const datum = normaliseerDatum(
    veld(rij, ["datum", "wedstrijddatum", "date", "speeldatum", "aanvang"]),
  );
  const thuis = veld(rij, ["thuisteam", "thuis", "homeTeam", "home", "teamThuis"]);
  const uit = veld(rij, ["uitteam", "uit", "awayTeam", "away", "teamUit"]);
  const uitslag = veld(rij, ["uitslag", "score", "result", "eindstand"]);
  const bron_id = veld(rij, ["wedstrijdcode", "wedstrijdnummer", "id", "matchId", "code"]);

  if (!datum || (!thuis && !uit)) return null;

  // Bepaal de tegenstander: het team dat NIET ons team is.
  let tegenstander = uit ?? thuis ?? "Onbekend";
  if (teamCode && thuis && uit) {
    const onsIsThuis = thuis.toLowerCase().includes(teamCode.toLowerCase());
    tegenstander = onsIsThuis ? uit : thuis;
  } else if (thuis && uit) {
    // Zonder teamCode: toon "Thuis - Uit" zodat het altijd herkenbaar is.
    tegenstander = `${thuis} - ${uit}`;
  }

  return { bron_id, datum, tegenstander, uitslag };
}

export interface FetchResultaat {
  wedstrijden: ProgrammaWedstrijd[];
  // Hulp bij finetunen: de sleutels van de eerste ruwe rij, als mapping leeg blijft.
  voorbeeldSleutels?: string[];
}

// Haalt het programma op en mapt het. Gooit bij netwerk-/parsefouten.
export async function fetchProgramma(config: KnvbConfig): Promise<FetchResultaat> {
  const url = new URL(config.url);
  // Sorteer op tijd indien de service dat ondersteunt; schaadt anders niet.
  if (!url.searchParams.has("order")) url.searchParams.set("order", "time");
  if (config.teamCode && !url.searchParams.has("team")) {
    url.searchParams.set("team", config.teamCode);
  }

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`KNVB Dataservice gaf status ${res.status}`);
  }

  const data: unknown = await res.json();
  // Respons kan een array zijn, of een object met een data/wedstrijden-veld.
  const rijen: Record<string, unknown>[] = Array.isArray(data)
    ? (data as Record<string, unknown>[])
    : (((data as Record<string, unknown>)?.data ??
        (data as Record<string, unknown>)?.wedstrijden ??
        []) as Record<string, unknown>[]);

  const wedstrijden = rijen
    .map((r) => mapNaarWedstrijd(r, config.teamCode))
    .filter((w): w is ProgrammaWedstrijd => w !== null);

  return {
    wedstrijden,
    voorbeeldSleutels:
      wedstrijden.length === 0 && rijen.length > 0
        ? Object.keys(rijen[0])
        : undefined,
  };
}
