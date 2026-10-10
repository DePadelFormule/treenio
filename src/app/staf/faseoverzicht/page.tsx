import Link from "next/link";
import { redirect } from "next/navigation";
import { getHuidigeGebruiker } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type {
  Speler,
  Training,
  TrainingRegistratie,
  Wedstrijd,
  WedstrijdRegistratie,
  Ontwikkeldoel,
} from "@/lib/types/database";

// Seizoen 26-27 start in augustus; standaard beginpunt als er nog geen fase
// gekozen is.
const SEIZOEN_START = "2026-08-01";
const TELT_ALS_AANWEZIG = new Set(["aanwezig", "te_laat", "te_laat_met"]);

function vandaag() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });
}
function isDatum(v: string | undefined): v is string {
  return !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

interface Teller { aanwezig: number; totaal: number; teLaat: number; materiaalMis: number; }
interface WTeller {
  wedstrijden: number; basis: number; ingevallen: number; gewisseldUit: number; bank90: number;
  minuten: number; goals: number; assists: number; geel: number; rood: number;
  posities: Map<string, number>;
}
interface DoelTeller { open: number; bezig: number; behaald: number; }

export default async function FaseoverzichtPage({
  searchParams,
}: {
  searchParams: Promise<{ van?: string; tot?: string }>;
}) {
  const gebruiker = await getHuidigeGebruiker();
  if (!gebruiker) redirect("/login");
  if (gebruiker.rol !== "staf") redirect("/");

  const { van: vanParam, tot: totParam } = await searchParams;
  const van = isDatum(vanParam) ? vanParam : SEIZOEN_START;
  const tot = isDatum(totParam) ? totParam : vandaag();

  const supabase = await createClient();
  const [{ data: spelers }, { data: trainingen }, { data: wedstrijden }, { data: doelen }] = await Promise.all([
    supabase.from("spelers").select("*").order("rugnummer", { ascending: true, nullsFirst: false }),
    supabase.from("trainingen").select("id, datum").gte("datum", van).lte("datum", tot),
    supabase.from("wedstrijden").select("*").gte("datum", van).lte("datum", tot).order("datum", { ascending: true }),
    supabase.from("ontwikkeldoelen").select("speler_id, status"),
  ]);

  const trainingenLijst = (trainingen ?? []) as Pick<Training, "id" | "datum">[];
  const trainingIds = trainingenLijst.map((t) => t.id);
  const datumPerTraining = new Map(trainingenLijst.map((t) => [t.id, t.datum]));

  const wedstrijdenLijst = (wedstrijden ?? []) as Wedstrijd[];
  const wedstrijdIds = wedstrijdenLijst.map((w) => w.id);

  const [{ data: trainingRegs }, { data: wedstrijdRegs }] = await Promise.all([
    trainingIds.length
      ? supabase.from("training_registraties").select("training_id, speler_id, status, materiaal_ontbreekt").in("training_id", trainingIds)
      : Promise.resolve({ data: [] as unknown[] }),
    wedstrijdIds.length
      ? supabase.from("wedstrijd_registraties").select("*").in("wedstrijd_id", wedstrijdIds)
      : Promise.resolve({ data: [] as unknown[] }),
  ]);

  const alleSpelers = ((spelers ?? []) as Speler[]).filter((s) => !s.gast);

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

  // ---- Ontwikkeldoelen: huidige stand (niet aan de fase gekoppeld — er wordt
  // geen datum bijgehouden van wanneer een doel is afgerond).
  const doelTellers = new Map<string, DoelTeller>();
  for (const d of (doelen ?? []) as Pick<Ontwikkeldoel, "speler_id" | "status">[]) {
    const t = doelTellers.get(d.speler_id) ?? { open: 0, bezig: 0, behaald: 0 };
    if (d.status === "open") t.open++;
    else if (d.status === "bezig") t.bezig++;
    else if (d.status === "behaald") t.behaald++;
    doelTellers.set(d.speler_id, t);
  }

  const rows = alleSpelers.map((s) => {
    const t = alleTellers.get(s.id);
    const w = wTellers.get(s.id);
    const d = doelTellers.get(s.id);
    let topPositie: string | null = null, topAantal = 0;
    if (w) for (const [pos, n] of w.posities) if (n > topAantal) { topPositie = pos; topAantal = n; }
    return {
      id: s.id,
      naam: s.naam,
      rugnummer: s.rugnummer,
      opkomst: t && t.totaal > 0 ? Math.round((100 * t.aanwezig) / t.totaal) : null,
      opkomstGec: opkomstGecorrigeerd(s.id),
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
      doelen: d ?? { open: 0, bezig: 0, behaald: 0 },
    };
  });

  const thCls = "px-2 py-2 text-left font-semibold text-neutral-600 whitespace-nowrap";
  const tdCls = "px-2 py-2 whitespace-nowrap";

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <Link href="/staf" className="text-sm text-neutral-500 hover:text-sparta hover:underline">
        ← Terug naar dashboard
      </Link>

      <h1 className="mt-4 mb-1 text-2xl font-bold text-sparta">Faseoverzicht</h1>
      <p className="mb-5 text-sm text-neutral-500">
        Kies een periode (bijv. het begin en eind van een fase) voor een overzicht van opkomst,
        wedstrijdstatistieken en ontwikkeldoelen per speler.
      </p>

      <form className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-neutral-200 bg-white p-4">
        <label className="text-sm">
          <span className="mb-1 block text-xs text-neutral-500">Van</span>
          <input type="date" name="van" defaultValue={van} className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs text-neutral-500">Tot en met</span>
          <input type="date" name="tot" defaultValue={tot} className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm" />
        </label>
        <button type="submit" className="rounded-lg bg-sparta px-4 py-1.5 text-sm font-semibold text-white hover:bg-sparta-dark">
          Bekijk fase
        </button>
      </form>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-400">
          Nog geen spelers.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500">
                <th className={thCls}>#</th>
                <th className={thCls}>Naam</th>
                <th className={thCls}>Opkomst</th>
                <th className={thCls}>Opk. gec.</th>
                <th className={thCls}>Te laat</th>
                <th className={thCls}>Mat. mis</th>
                <th className={thCls}>Wedstr.</th>
                <th className={thCls}>Basis</th>
                <th className={thCls}>Inval</th>
                <th className={thCls}>Gewiss.</th>
                <th className={thCls}>Bank (90)</th>
                <th className={thCls}>Minuten</th>
                <th className={thCls}>Goals</th>
                <th className={thCls}>Assists</th>
                <th className={thCls}>🟨</th>
                <th className={thCls}>🟥</th>
                <th className={thCls}>Vaste positie</th>
                <th className={thCls}>Doelen (open/bezig/behaald)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-neutral-100 last:border-0">
                  <td className={tdCls}>{r.rugnummer ?? "–"}</td>
                  <td className={tdCls}>
                    <Link href={`/staf/speler/${r.id}`} className="font-medium text-neutral-800 hover:text-sparta hover:underline">
                      {r.naam}
                    </Link>
                  </td>
                  <td className={tdCls}>{r.opkomst != null ? `${r.opkomst}%` : "—"}</td>
                  <td className={`${tdCls} text-neutral-500`}>{r.opkomstGec != null ? `${r.opkomstGec}%` : "—"}</td>
                  <td className={`${tdCls} ${r.teLaat > 0 ? "font-semibold text-sparta" : ""}`}>{r.teLaat}</td>
                  <td className={tdCls}>{r.materiaalMis}</td>
                  <td className={tdCls}>{r.wedstrijden}</td>
                  <td className={tdCls}>{r.basis}</td>
                  <td className={tdCls}>{r.ingevallen}</td>
                  <td className={tdCls}>{r.gewisseldUit}</td>
                  <td className={tdCls}>{r.bank90}</td>
                  <td className={tdCls}>{r.minuten}</td>
                  <td className={`${tdCls} font-semibold`}>{r.goals}</td>
                  <td className={`${tdCls} font-semibold`}>{r.assists}</td>
                  <td className={tdCls}>{r.geel}</td>
                  <td className={tdCls}>{r.rood}</td>
                  <td className={tdCls}>{r.topPositie ? `${r.topPositie} (${r.topAantal}x)` : "—"}</td>
                  <td className={`${tdCls} text-neutral-500`}>{r.doelen.open}/{r.doelen.bezig}/{r.doelen.behaald}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="mt-8 mb-2 text-lg font-bold text-neutral-800">Uitslagen in deze periode</h2>
      {wedstrijdenLijst.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-400">
          Geen wedstrijden in deze periode.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {wedstrijdenLijst.map((w) => (
            <li key={w.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-neutral-200 bg-white p-2.5 text-sm">
              <span>
                <span className="text-neutral-500">{w.datum}</span>{" "}
                <span className="font-medium text-neutral-800">vs {w.tegenstander}</span>
                {w.type === "beker" ? " · Beker" : w.type === "vriendschappelijk" ? " · Vriendschappelijk" : ""}
              </span>
              <span className="font-bold tabular-nums text-sparta">{w.uitslag ?? "—"}</span>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 text-xs text-neutral-400">
        "Opk. gec." telt per maand 2x te laat als 1x minder aanwezig. "Vaste positie" is de positie
        die een speler deze periode het vaakst speelde. Ontwikkeldoelen tonen de huidige stand (niet
        aan de gekozen periode gekoppeld — er wordt geen datum bijgehouden van wanneer een doel is
        afgerond).
      </p>
    </main>
  );
}
