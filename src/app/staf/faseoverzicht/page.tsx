import Link from "next/link";
import { redirect } from "next/navigation";
import { getHuidigeGebruiker } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { berekenFaseStats, berekenDoelTellers, haalWedstrijden } from "@/lib/faseoverzicht";
import { FaseoverzichtTabel, type FaseRij } from "@/components/FaseoverzichtTabel";
import { maakFase, verwijderFase } from "./actions";
import { VerwijderKnop } from "@/components/VerwijderKnop";
import type { Speler, Fase } from "@/lib/types/database";

// Seizoen 26-27 start in augustus; standaard beginpunt als er nog geen fase
// gekozen is.
const SEIZOEN_START = "2026-08-01";

function vandaag() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });
}
function isDatum(v: string | undefined): v is string {
  return !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

export default async function FaseoverzichtPage({
  searchParams,
}: {
  searchParams: Promise<{ van?: string; tot?: string; vergelijk?: string }>;
}) {
  const gebruiker = await getHuidigeGebruiker();
  if (!gebruiker) redirect("/login");
  if (gebruiker.rol !== "staf") redirect("/");

  const { van: vanParam, tot: totParam, vergelijk: vergelijkId } = await searchParams;
  const van = isDatum(vanParam) ? vanParam : SEIZOEN_START;
  const tot = isDatum(totParam) ? totParam : vandaag();

  const supabase = await createClient();
  const [{ data: spelers }, { data: fasesData }] = await Promise.all([
    supabase.from("spelers").select("*").order("rugnummer", { ascending: true, nullsFirst: false }),
    supabase.from("fases").select("*").order("van", { ascending: true }),
  ]);
  const fases = (fasesData ?? []) as Fase[];
  const vergelijkFase = vergelijkId ? fases.find((f) => f.id === vergelijkId) ?? null : null;

  const alleSpelers = ((spelers ?? []) as Speler[]).filter((s) => !s.gast);

  const [stats, doelTellers, wedstrijdenLijst, vergelijkStats] = await Promise.all([
    berekenFaseStats(supabase, van, tot),
    berekenDoelTellers(supabase),
    haalWedstrijden(supabase, van, tot),
    vergelijkFase ? berekenFaseStats(supabase, vergelijkFase.van, vergelijkFase.tot) : Promise.resolve(null),
  ]);

  const rows: FaseRij[] = alleSpelers.map((s) => {
    const t = stats.get(s.id);
    const d = doelTellers.get(s.id);
    const v = vergelijkStats?.get(s.id);
    return {
      id: s.id,
      naam: s.naam,
      rugnummer: s.rugnummer,
      opkomst: t?.opkomst ?? null,
      opkomstGec: t?.opkomstGec ?? null,
      teLaat: t?.teLaat ?? 0,
      materiaalMis: t?.materiaalMis ?? 0,
      wedstrijden: t?.wedstrijden ?? 0,
      basis: t?.basis ?? 0,
      ingevallen: t?.ingevallen ?? 0,
      gewisseldUit: t?.gewisseldUit ?? 0,
      bank90: t?.bank90 ?? 0,
      minuten: t?.minuten ?? 0,
      goals: t?.goals ?? 0,
      assists: t?.assists ?? 0,
      geel: t?.geel ?? 0,
      rood: t?.rood ?? 0,
      topPositie: t?.topPositie ?? null,
      topAantal: t?.topAantal ?? 0,
      doelenOpen: d?.open ?? 0,
      doelenBezig: d?.bezig ?? 0,
      doelenBehaald: d?.behaald ?? 0,
      dOpkomst: vergelijkStats ? (t?.opkomst ?? 0) - (v?.opkomst ?? 0) : undefined,
      dOpkomstGec: vergelijkStats ? (t?.opkomstGec ?? 0) - (v?.opkomstGec ?? 0) : undefined,
      dTeLaat: vergelijkStats ? (t?.teLaat ?? 0) - (v?.teLaat ?? 0) : undefined,
      dMinuten: vergelijkStats ? (t?.minuten ?? 0) - (v?.minuten ?? 0) : undefined,
      dGoals: vergelijkStats ? (t?.goals ?? 0) - (v?.goals ?? 0) : undefined,
      dAssists: vergelijkStats ? (t?.assists ?? 0) - (v?.assists ?? 0) : undefined,
    };
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <Link href="/staf" className="text-sm text-neutral-500 hover:text-sparta hover:underline">
        ← Terug naar dashboard
      </Link>

      <h1 className="mt-4 mb-1 text-2xl font-bold text-sparta">Faseoverzicht</h1>
      <p className="mb-5 text-sm text-neutral-500">
        Kies een periode (bijv. het begin en eind van een fase) voor een overzicht van opkomst,
        wedstrijdstatistieken en ontwikkeldoelen per speler. Tik op een kolomkop om te sorteren —
        bijv. op "Te laat" om te zien wie dat het vaakst deed.
      </p>

      <form className="mb-3 flex flex-wrap items-end gap-3 rounded-xl border border-neutral-200 bg-white p-4">
        <label className="text-sm">
          <span className="mb-1 block text-xs text-neutral-500">Van</span>
          <input type="date" name="van" defaultValue={van} className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs text-neutral-500">Tot en met</span>
          <input type="date" name="tot" defaultValue={tot} className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm" />
        </label>
        {vergelijkId && <input type="hidden" name="vergelijk" value={vergelijkId} />}
        <button type="submit" className="rounded-lg bg-sparta px-4 py-1.5 text-sm font-semibold text-white hover:bg-sparta-dark">
          Bekijk periode
        </button>
      </form>

      <form action={maakFase} className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-dashed border-neutral-300 bg-white p-4">
        <input type="hidden" name="van" value={van} />
        <input type="hidden" name="tot" value={tot} />
        <label className="flex-1 text-sm">
          <span className="mb-1 block text-xs text-neutral-500">Deze periode ({van} t/m {tot}) opslaan als fase</span>
          <input type="text" name="naam" required placeholder="bijv. Fase 1" className="w-full max-w-xs rounded-lg border border-neutral-300 px-2 py-1.5 text-sm" />
        </label>
        <button type="submit" className="rounded-lg bg-neutral-800 px-4 py-1.5 text-sm font-semibold text-white hover:bg-neutral-700">
          Fase opslaan
        </button>
      </form>

      {fases.length > 0 && (
        <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-4">
          <p className="mb-2 text-sm font-semibold text-neutral-700">Opgeslagen fases</p>
          <ul className="flex flex-wrap gap-2">
            {fases.map((f) => (
              <li key={f.id} className="flex items-center gap-1 rounded-full border border-neutral-200 bg-neutral-50 pl-3 pr-1 py-1 text-sm">
                <Link href={`/staf/faseoverzicht?van=${f.van}&tot=${f.tot}`} className="text-neutral-700 hover:text-sparta hover:underline">
                  {f.naam}
                </Link>
                <span className="text-xs text-neutral-400">{f.van} t/m {f.tot}</span>
                <Link
                  href={`/staf/faseoverzicht?van=${van}&tot=${tot}&vergelijk=${f.id}`}
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${vergelijkId === f.id ? "bg-sparta text-white" : "bg-neutral-200 text-neutral-600 hover:bg-sparta hover:text-white"}`}
                >
                  vergelijk
                </Link>
                <VerwijderKnop action={verwijderFase} id={f.id} bevestig={`Fase "${f.naam}" verwijderen?`} label="×" />
              </li>
            ))}
          </ul>
          {vergelijkFase && (
            <p className="mt-2 text-xs text-neutral-500">
              Vergeleken met <span className="font-semibold">{vergelijkFase.naam}</span> ({vergelijkFase.van} t/m {vergelijkFase.tot}) —
              groen/rood toont het verschil.{" "}
              <Link href={`/staf/faseoverzicht?van=${van}&tot=${tot}`} className="text-sparta hover:underline">Stop met vergelijken</Link>
            </p>
          )}
        </div>
      )}

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-400">
          Nog geen spelers.
        </p>
      ) : (
        <FaseoverzichtTabel rows={rows} />
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
