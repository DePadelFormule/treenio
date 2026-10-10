import type { Training, TrainingRegistratie, Wedstrijd, WedstrijdRegistratie, Ontwikkeldoel } from "@/lib/types/database";

const TELT_ALS_AANWEZIG = new Set(["aanwezig", "te_laat", "te_laat_met"]);

interface Teller { aanwezig: number; totaal: number; teLaat: number; materiaalMis: number; }
interface WTeller {
  wedstrijden: number; basis: number; ingevallen: number; gewisseldUit: number; bank90: number;
  minuten: number; goals: number; assists: number; geel: number; rood: number;
  posities: Map<string, number>;
}

export interface FaseStats {
  opkomst: number | null;
  opkomstGec: number | null;
  teLaat: number;
  materiaalMis: number;
  wedstrijden: number;
  basis: number;
  ingevallen: number;
  gewisseldUit: number;
  bank90: number;
  minuten: number;
  goals: number;
  assists: number;
  geel: number;
  rood: number;
  topPositie: string | null;
  topAantal: number;
}

/** Statistieken per speler voor een periode (van/tot, allebei inclusief). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function berekenFaseStats(supabase: any, van: string, tot: string): Promise<Map<string, FaseStats>> {
  const [{ data: trainingen }, { data: wedstrijden }] = await Promise.all([
    supabase.from("trainingen").select("id, datum").gte("datum", van).lte("datum", tot),
    supabase.from("wedstrijden").select("id").gte("datum", van).lte("datum", tot),
  ]);

  const trainingenLijst = (trainingen ?? []) as Pick<Training, "id" | "datum">[];
  const trainingIds = trainingenLijst.map((t) => t.id);
  const datumPerTraining = new Map(trainingenLijst.map((t) => [t.id, t.datum]));
  const wedstrijdIds = ((wedstrijden ?? []) as { id: string }[]).map((w) => w.id);

  const [{ data: trainingRegs }, { data: wedstrijdRegs }] = await Promise.all([
    trainingIds.length
      ? supabase.from("training_registraties").select("training_id, speler_id, status, materiaal_ontbreekt").in("training_id", trainingIds)
      : Promise.resolve({ data: [] as unknown[] }),
    wedstrijdIds.length
      ? supabase.from("wedstrijd_registraties").select("*").in("wedstrijd_id", wedstrijdIds)
      : Promise.resolve({ data: [] as unknown[] }),
  ]);

  // ---- Trainingsopkomst: ruw + gecorrigeerd (2x te laat = 1x minder), per
  // maand berekend en dan opgeteld, zodat de correctie per kalendermaand reset.
  const alleTellers = new Map<string, Teller>();
  const maandTellers = new Map<string, Map<string, Teller>>();
  for (const r of (trainingRegs ?? []) as Pick<TrainingRegistratie, "training_id" | "speler_id" | "status" | "materiaal_ontbreekt">[]) {
    if (!r.status) continue;
    const datum = datumPerTraining.get(r.training_id);
    if (!datum) continue;
    const telt = TELT_ALS_AANWEZIG.has(r.status);
    const teLaat = r.status === "te_laat" || r.status === "te_laat_met";

    const t = alleTellers.get(r.speler_id) ?? { aanwezig: 0, totaal: 0, teLaat: 0, materiaalMis: 0 };
    t.totaal++; if (telt) t.aanwezig++; if (teLaat) t.teLaat++; if (r.materiaal_ontbreekt) t.materiaalMis++;
    alleTellers.set(r.speler_id, t);

    const maand = datum.slice(0, 7);
    if (!maandTellers.has(maand)) maandTellers.set(maand, new Map());
    const mm = maandTellers.get(maand)!;
    const mt = mm.get(r.speler_id) ?? { aanwezig: 0, totaal: 0, teLaat: 0, materiaalMis: 0 };
    mt.totaal++; if (telt) mt.aanwezig++; if (teLaat) mt.teLaat++;
    mm.set(r.speler_id, mt);
  }
  function opkomstGecorrigeerd(spelerId: string): number | null {
    let totaal = 0, aanwezigGec = 0;
    for (const mm of maandTellers.values()) {
      const mt = mm.get(spelerId);
      if (!mt) continue;
      totaal += mt.totaal;
      aanwezigGec += Math.max(0, mt.aanwezig - Math.floor(mt.teLaat / 2));
    }
    return totaal > 0 ? Math.round((100 * aanwezigGec) / totaal) : null;
  }

  // ---- Wedstrijden: speelminuten, basis/wissel, kaarten, posities.
  const wTellers = new Map<string, WTeller>();
  for (const r of (wedstrijdRegs ?? []) as WedstrijdRegistratie[]) {
    const betrokken = r.startte_als !== "niet_in_selectie" || r.speelminuten > 0;
    if (!betrokken) continue;
    const t = wTellers.get(r.speler_id) ?? {
      wedstrijden: 0, basis: 0, ingevallen: 0, gewisseldUit: 0, bank90: 0,
      minuten: 0, goals: 0, assists: 0, geel: 0, rood: 0, posities: new Map(),
    };
    t.wedstrijden++;
    if (r.startte_als === "basis") t.basis++;
    if (r.ingevallen) t.ingevallen++;
    if (r.gewisseld_uit) t.gewisseldUit++;
    if (r.volledige_bank) t.bank90++;
    t.minuten += r.speelminuten;
    t.goals += r.goals;
    t.assists += r.assists;
    t.geel += r.gele_kaarten;
    if (r.rode_kaart) t.rood++;
    if (r.positie) t.posities.set(r.positie, (t.posities.get(r.positie) ?? 0) + 1);
    wTellers.set(r.speler_id, t);
  }

  const spelerIds = new Set<string>([...alleTellers.keys(), ...wTellers.keys()]);
  const uit = new Map<string, FaseStats>();
  for (const id of spelerIds) {
    const t = alleTellers.get(id);
    const w = wTellers.get(id);
    let topPositie: string | null = null, topAantal = 0;
    if (w) for (const [pos, n] of w.posities) if (n > topAantal) { topPositie = pos; topAantal = n; }
    uit.set(id, {
      opkomst: t && t.totaal > 0 ? Math.round((100 * t.aanwezig) / t.totaal) : null,
      opkomstGec: opkomstGecorrigeerd(id),
      teLaat: t?.teLaat ?? 0,
      materiaalMis: t?.materiaalMis ?? 0,
      wedstrijden: w?.wedstrijden ?? 0,
      basis: w?.basis ?? 0,
      ingevallen: w?.ingevallen ?? 0,
      gewisseldUit: w?.gewisseldUit ?? 0,
      bank90: w?.bank90 ?? 0,
      minuten: w?.minuten ?? 0,
      goals: w?.goals ?? 0,
      assists: w?.assists ?? 0,
      geel: w?.geel ?? 0,
      rood: w?.rood ?? 0,
      topPositie, topAantal,
    });
  }
  return uit;
}

export interface DoelTeller { open: number; bezig: number; behaald: number; }

/** Huidige stand van de ontwikkeldoelen (niet periode-gebonden). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function berekenDoelTellers(supabase: any): Promise<Map<string, DoelTeller>> {
  const { data: doelen } = await supabase.from("ontwikkeldoelen").select("speler_id, status");
  const doelTellers = new Map<string, DoelTeller>();
  for (const d of (doelen ?? []) as Pick<Ontwikkeldoel, "speler_id" | "status">[]) {
    const t = doelTellers.get(d.speler_id) ?? { open: 0, bezig: 0, behaald: 0 };
    if (d.status === "open") t.open++;
    else if (d.status === "bezig") t.bezig++;
    else if (d.status === "behaald") t.behaald++;
    doelTellers.set(d.speler_id, t);
  }
  return doelTellers;
}

/** Wedstrijden (met uitslag) binnen een periode. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function haalWedstrijden(supabase: any, van: string, tot: string): Promise<Wedstrijd[]> {
  const { data } = await supabase.from("wedstrijden").select("*").gte("datum", van).lte("datum", tot).order("datum", { ascending: true });
  return (data ?? []) as Wedstrijd[];
}
