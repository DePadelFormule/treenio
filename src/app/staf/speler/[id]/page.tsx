import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getHuidigeGebruiker } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PlayerCard } from "@/components/PlayerCard";
import type {
  Badge,
  Ontwikkeldoel,
  Speler,
  SpelerRecord,
  StafNotitie,
  TrainingOpkomstView,
  WedstrijdTotalenView,
  KeeperTotalenView,
} from "@/lib/types/database";

// Staf-only speler-detail. Toont alle drie de lagen READ-ONLY:
//   Laag 1 (kaartje), Laag 2 (ontwikkeldoelen), Laag 3 (staf-notities).
// De schrijf-flows (post-wedstrijd, functioneringsgesprek-split) volgen.
export default async function StafSpelerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const gebruiker = await getHuidigeGebruiker();
  if (!gebruiker) redirect("/login");
  if (gebruiker.rol !== "staf") redirect("/");

  const { id } = await params;
  const supabase = await createClient();

  const { data: speler } = await supabase
    .from("spelers")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!speler) notFound();

  const [
    { data: badges },
    { data: records },
    { data: doelen },
    { data: notities },
    { data: opkomstRows },
    { data: wedstrijdRows },
    { data: keeperRows },
  ] = await Promise.all([
    supabase.from("badges").select("*").eq("speler_id", id),
    supabase.from("records").select("*").eq("speler_id", id),
    supabase.from("ontwikkeldoelen").select("*").eq("speler_id", id),
    supabase.from("staf_notities").select("*").eq("speler_id", id),
    supabase.from("v_training_opkomst").select("*").eq("speler_id", id),
    supabase.from("v_wedstrijd_totalen").select("*").eq("speler_id", id),
    supabase.from("v_keeper_totalen").select("*").eq("speler_id", id),
  ]);

  const opkomst = (opkomstRows?.[0] ?? null) as TrainingOpkomstView | null;
  const wedstrijd = (wedstrijdRows?.[0] ?? null) as WedstrijdTotalenView | null;
  const keeper = (keeperRows?.[0] ?? null) as KeeperTotalenView | null;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/staf" className="text-sm text-neutral-500 hover:text-pitch hover:underline">
        ← Terug naar selectie
      </Link>

      <div className="mt-6 grid gap-8 md:grid-cols-[auto_1fr]">
        <div className="flex justify-center">
          <PlayerCard
            speler={speler as Speler}
            badges={(badges ?? []) as Badge[]}
            records={(records ?? []) as SpelerRecord[]}
          />
        </div>

        <div className="space-y-6">
          {/* Laag 2 */}
          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-pitch">
              Laag 2 · Ontwikkeldoelen (speler ziet dit)
            </h2>
            {doelen && doelen.length ? (
              <ul className="space-y-2">
                {(doelen as Ontwikkeldoel[]).map((d) => (
                  <li key={d.id} className="rounded-lg border border-neutral-200 bg-white p-3 text-sm">
                    <span className="font-medium">{d.doel}</span>
                    <span className="ml-2 text-xs text-neutral-400">({d.status})</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-neutral-400">Nog geen doelen.</p>
            )}
          </section>

          {/* Laag 3 */}
          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-red-600">
              Laag 3 · Staf-only (NOOIT zichtbaar voor speler)
            </h2>
            {notities && notities.length ? (
              <ul className="space-y-2">
                {(notities as StafNotitie[]).map((n) => (
                  <li key={n.id} className="rounded-lg border border-red-200 bg-red-50/50 p-3 text-sm">
                    {n.inschatting && <p><strong>Inschatting:</strong> {n.inschatting}</p>}
                    {n.verwachting && <p><strong>Verwachting:</strong> {n.verwachting}</p>}
                    {n.positie_inschatting && (
                      <p><strong>Positie:</strong> {n.positie_inschatting}</p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-neutral-400">Nog geen staf-notities.</p>
            )}
          </section>
        </div>
      </div>

      {/* Staf-only registratie-aggregaten (Laag 3-scope) */}
      <section className="mt-10">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-red-600">
          Laag 3 · Registratie (staf-only)
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold text-neutral-700">Trainingen</h3>
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <Stat label="Opkomst" value={opkomst?.opkomst_pct != null ? `${opkomst.opkomst_pct}%` : "–"} />
              <Stat label="Aanwezig" value={`${opkomst?.aanwezig ?? 0}/${opkomst?.geregistreerd ?? 0}`} />
              <Stat label="Gem. inzet" value={opkomst?.gem_inzet != null ? `${opkomst.gem_inzet}/5` : "–"} />
              <Stat label="Op tijd afgemeld" value={opkomst?.afgemeld_op_tijd ?? 0} />
              <Stat label="Te laat afgemeld" value={opkomst?.afgemeld_te_laat ?? 0} alert />
            </dl>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold text-neutral-700">Wedstrijden</h3>
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <Stat label="In selectie" value={wedstrijd?.in_selectie ?? 0} />
              <Stat label="Basisplaatsen" value={wedstrijd?.basisplaatsen ?? 0} />
              <Stat label="Invalbeurten" value={wedstrijd?.invalbeurten ?? 0} />
              <Stat label="90 min bank" value={wedstrijd?.keer_90_bank ?? 0} />
              <Stat label="Eruit gewisseld" value={wedstrijd?.keer_uit_gewisseld ?? 0} />
              <Stat label="Speelminuten" value={wedstrijd?.totaal_minuten ?? 0} />
              <Stat label="Goals" value={wedstrijd?.goals ?? 0} />
              <Stat label="Assists" value={wedstrijd?.assists ?? 0} />
              <Stat label="Geel / rood" value={`${wedstrijd?.gele_kaarten ?? 0} / ${wedstrijd?.rode_kaarten ?? 0}`} />
              <Stat label="Overtr. ± (maak/tegen)" value={`${wedstrijd?.overtredingen_gemaakt ?? 0} / ${wedstrijd?.overtredingen_tegen ?? 0}`} />
              <Stat label="Balverlies" value={wedstrijd?.balverlies ?? 0} />
            </dl>
          </div>

          {keeper && keeper.wedstrijden_keep > 0 ? (
            <div className="rounded-xl border border-neutral-200 bg-white p-4 sm:col-span-2">
              <h3 className="mb-3 text-sm font-semibold text-neutral-700">
                Keeper 🧤
              </h3>
              <dl className="grid grid-cols-2 gap-y-2 text-sm sm:grid-cols-4">
                <Stat label="Wedstrijden" value={keeper.wedstrijden_keep} />
                <Stat label="Clean sheets" value={keeper.clean_sheets} />
                <Stat label="Reddingen" value={keeper.reddingen} />
                <Stat label="1-op-1 reddingen" value={keeper.een_op_een_reddingen} />
                <Stat label="Hoge ballen gepakt" value={keeper.hoge_ballen_gepakt} />
                <Stat label="Saves buiten 16m" value={keeper.reddingen_buiten_16} />
                <Stat label="Tegengoals" value={keeper.tegengoals} />
                <Stat label="Lang uitgetrapt" value={keeper.uittrappen_lang} />
                <Stat label="Opbouw van achteruit" value={keeper.opbouw_van_achteruit} />
              </dl>
            </div>
          ) : null}
        </div>
        <p className="mt-3 text-xs text-neutral-400">
          Registratie gebeurt (straks) via het iPad-tiksysteem. Deze cijfers
          zijn uitsluitend voor de staf — de speler ziet ze nooit.
        </p>
      </section>
    </main>
  );
}

function Stat({
  label,
  value,
  alert,
}: {
  label: string;
  value: string | number;
  alert?: boolean;
}) {
  return (
    <div className="flex flex-col">
      <dt className="text-xs text-neutral-400">{label}</dt>
      <dd className={`font-semibold ${alert && value ? "text-red-600" : "text-neutral-800"}`}>
        {value}
      </dd>
    </div>
  );
}
