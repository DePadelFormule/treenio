import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getHuidigeGebruiker } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SpelerRegistratieKaart } from "@/components/registratie/SpelerRegistratieKaart";
import { KeeperPaneel } from "@/components/registratie/KeeperPaneel";
import { TeamStatsPaneel } from "@/components/registratie/TeamStatsPaneel";
import type {
  Speler,
  Wedstrijd,
  WedstrijdRegistratie,
  KeeperRegistratie,
  WedstrijdTeamStats,
} from "@/lib/types/database";

type RegBegin = Omit<WedstrijdRegistratie, "id" | "wedstrijd_id" | "speler_id" | "opmerking" | "created_at">;

const LEEG_REG: RegBegin = {
  op_tijd: null,
  afmeld_status: "nvt",
  startte_als: "niet_in_selectie",
  positie: null,
  speelminuten: 0,
  gewisseld_uit: false,
  ingevallen: false,
  volledige_bank: false,
  goals: 0,
  assists: 0,
  gele_kaarten: 0,
  rode_kaart: false,
  overtredingen_gemaakt: 0,
  overtredingen_tegen: 0,
  balverlies: 0,
};

export default async function RegistrerenPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const gebruiker = await getHuidigeGebruiker();
  if (!gebruiker) redirect("/login");
  if (gebruiker.rol !== "staf") redirect("/");

  const { id } = await params;
  const supabase = await createClient();

  const { data: wedstrijd } = await supabase
    .from("wedstrijden")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!wedstrijd) notFound();
  const w = wedstrijd as Wedstrijd;

  const [{ data: spelers }, { data: regs }, { data: keepers }, { data: team }] =
    await Promise.all([
      supabase.from("spelers").select("*").order("rugnummer", { ascending: true, nullsFirst: false }),
      supabase.from("wedstrijd_registraties").select("*").eq("wedstrijd_id", id),
      supabase.from("keeper_registraties").select("*").eq("wedstrijd_id", id),
      supabase.from("wedstrijd_team_stats").select("*").eq("wedstrijd_id", id).maybeSingle(),
    ]);

  const spelerLijst = (spelers ?? []) as Speler[];

  // Bestaande registraties indexeren op speler_id.
  const regMap = new Map<string, WedstrijdRegistratie>();
  for (const r of (regs ?? []) as WedstrijdRegistratie[]) regMap.set(r.speler_id, r);

  const keeperMap: Record<string, Omit<KeeperRegistratie, "id" | "wedstrijd_id" | "speler_id" | "opmerking" | "created_at">> = {};
  for (const k of (keepers ?? []) as KeeperRegistratie[]) {
    keeperMap[k.speler_id] = {
      hoge_ballen_gepakt: k.hoge_ballen_gepakt,
      reddingen: k.reddingen,
      een_op_een_reddingen: k.een_op_een_reddingen,
      reddingen_buiten_16: k.reddingen_buiten_16,
      tegengoals: k.tegengoals,
      clean_sheet: k.clean_sheet,
      uittrappen_lang: k.uittrappen_lang,
      opbouw_van_achteruit: k.opbouw_van_achteruit,
    };
  }

  const t = team as WedstrijdTeamStats | null;
  const teamBegin = {
    vrije_trappen_tegen: t?.vrije_trappen_tegen ?? 0,
    corners_tegen: t?.corners_tegen ?? 0,
    goals_uit_spel: t?.goals_uit_spel ?? 0,
    goals_uit_standaard: t?.goals_uit_standaard ?? 0,
    tegengoals_uit_spel: t?.tegengoals_uit_spel ?? 0,
    tegengoals_uit_standaard: t?.tegengoals_uit_standaard ?? 0,
  };

  function beginVoor(spelerId: string): RegBegin {
    const r = regMap.get(spelerId);
    if (!r) return LEEG_REG;
    return {
      op_tijd: r.op_tijd,
      afmeld_status: r.afmeld_status,
      startte_als: r.startte_als,
      positie: r.positie,
      speelminuten: r.speelminuten,
      gewisseld_uit: r.gewisseld_uit,
      ingevallen: r.ingevallen,
      volledige_bank: r.volledige_bank,
      goals: r.goals,
      assists: r.assists,
      gele_kaarten: r.gele_kaarten,
      rode_kaart: r.rode_kaart,
      overtredingen_gemaakt: r.overtredingen_gemaakt,
      overtredingen_tegen: r.overtredingen_tegen,
      balverlies: r.balverlies,
    };
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/staf/wedstrijden" className="text-sm text-neutral-500 hover:text-pitch hover:underline">
        ← Terug naar wedstrijden
      </Link>

      <header className="mt-4 mb-6">
        <h1 className="text-2xl font-bold text-pitch">Wedstrijd registreren</h1>
        <p className="text-sm text-neutral-500">
          {w.datum} · {w.tegenstander}{w.uitslag ? ` · ${w.uitslag}` : ""}
        </p>
        <p className="mt-1 text-xs text-red-600">
          Staf-only registratie — een speler ziet deze cijfers nooit.
        </p>
      </header>

      <section className="mb-8 space-y-4">
        <TeamStatsPaneel wedstrijdId={id} begin={teamBegin} />
        <KeeperPaneel wedstrijdId={id} spelers={spelerLijst.map((s) => ({ id: s.id, naam: s.naam }))} bestaand={keeperMap} />
      </section>

      <h2 className="mb-3 text-lg font-semibold text-neutral-800">Per speler</h2>
      <div className="space-y-4">
        {spelerLijst.map((s) => (
          <SpelerRegistratieKaart
            key={s.id}
            wedstrijdId={id}
            spelerId={s.id}
            naam={s.naam}
            rugnummer={s.rugnummer}
            begin={beginVoor(s.id)}
          />
        ))}
      </div>

      {spelerLijst.length === 0 && (
        <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-400">
          Nog geen spelers in de selectie.
        </p>
      )}
    </main>
  );
}
