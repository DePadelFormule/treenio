import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getHuidigeGebruiker } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { bewaarWedstrijdVerslag, bewaarScouting } from "./actions";
import type { Speler, Wedstrijd, WedstrijdEvent, WedstrijdRegistratie, WedstrijdVerslag, WedstrijdScouting } from "@/lib/types/database";

// Terugleesbaar wedstrijdverslag: scoreverloop, wissels, kaarten en
// speelminuten — alles wat tijdens de live-registratie is geturfd.
const LABEL: Record<string, string> = {
  goal: "⚽ Goal",
  assist: "🅰️ Assist",
  geel: "🟨 Gele kaart",
  rood: "🟥 Rode kaart",
  wissel_in: "🔺 Wissel in",
  wissel_uit: "🔻 Wissel uit",
  tegengoal: "⚽ Tegengoal",
  einde: "⏱️ Einde wedstrijd",
};

export default async function VerslagPage({ params }: { params: Promise<{ id: string }> }) {
  const gebruiker = await getHuidigeGebruiker();
  if (!gebruiker) redirect("/login");
  if (gebruiker.rol !== "staf") redirect("/");

  const { id } = await params;
  const supabase = await createClient();

  const { data: wedstrijd } = await supabase
    .from("wedstrijden").select("*").eq("id", id).maybeSingle();
  if (!wedstrijd) notFound();
  const w = wedstrijd as Wedstrijd;

  const [{ data: events }, { data: registraties }, { data: spelers }, { data: verslagRij }, { data: scoutingRij }] = await Promise.all([
    supabase.from("wedstrijd_events").select("*").eq("wedstrijd_id", id)
      .order("minuut", { ascending: true }).order("created_at", { ascending: true }),
    supabase.from("wedstrijd_registraties").select("*").eq("wedstrijd_id", id),
    supabase.from("spelers").select("*"),
    supabase.from("wedstrijd_verslag").select("*").eq("wedstrijd_id", id).maybeSingle(),
    supabase.from("wedstrijd_scouting").select("*").eq("wedstrijd_id", id).maybeSingle(),
  ]);
  const verslag = verslagRij as WedstrijdVerslag | null;
  const scouting = scoutingRij as WedstrijdScouting | null;

  const naamVan = new Map<string, { naam: string; rugnummer: number | null }>();
  for (const s of (spelers ?? []) as Speler[]) {
    naamVan.set(s.id, { naam: s.gast ? `${s.naam} (gast)` : s.naam, rugnummer: s.rugnummer });
  }

  const ev = ((events ?? []) as WedstrijdEvent[]);

  // Tijdlijn met tussenstand na elke goal.
  let voor = 0, tegen = 0;
  const tijdlijn = ev.map((e) => {
    if (e.type === "goal") voor++;
    if (e.type === "tegengoal") tegen++;
    return {
      id: e.id,
      minuut: e.minuut,
      type: e.type,
      speler: e.speler_id ? naamVan.get(e.speler_id)?.naam ?? "?" : null,
      stand: e.type === "goal" || e.type === "tegengoal" ? `${voor}-${tegen}` : null,
    };
  });

  const goals = ev.filter((e) => e.type === "goal");
  const doelpuntenmakers = [...goals.reduce((m, e) => {
    if (e.speler_id) m.set(e.speler_id, (m.get(e.speler_id) ?? 0) + 1);
    return m;
  }, new Map<string, number>())].sort((a, b) => b[1] - a[1]);

  // Speelminuten: iedereen die in de selectie zat of minuten heeft.
  const reg = ((registraties ?? []) as WedstrijdRegistratie[])
    .filter((r) => r.startte_als !== "niet_in_selectie" || r.speelminuten > 0)
    .sort((a, b) => b.speelminuten - a.speelminuten);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 print:py-2">
      <div className="flex items-center justify-between print:hidden">
        <Link href="/staf/wedstrijden" className="text-sm text-neutral-500 hover:text-sparta hover:underline">
          ← Terug naar wedstrijden
        </Link>
        <span className="flex gap-4">
          <Link href={`/staf/wedstrijd/${id}/verslag/print`} className="text-sm font-semibold text-sparta hover:underline">
            🖨️ Print/PDF
          </Link>
          <Link href={`/staf/wedstrijd/${id}/live`} className="text-sm font-semibold text-sparta hover:underline">
            Live-scherm →
          </Link>
        </span>
      </div>

      <header className="mt-4 mb-6">
        <h1 className="text-2xl font-bold text-sparta">Verslag · {w.tegenstander}</h1>
        <p className="text-sm text-neutral-500">
          {w.datum}
          {w.tijd && ` · ${w.tijd} uur`}
          {w.type === "beker" && " · Beker"}
          {w.type === "vriendschappelijk" && " · Vriendschappelijk"}
          {w.uitslag && (
            <> · Eindstand: <span className="font-bold text-neutral-800">{w.uitslag}</span> <span className="text-neutral-400">(wij-tegen)</span></>
          )}
        </p>
        {w.type === "vriendschappelijk" && (
          <p className="mt-1 text-xs text-amber-600">
            Vriendschappelijke wedstrijd — telt niet mee in de seizoensstatistieken.
          </p>
        )}
      </header>

      {ev.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-400">
          Voor deze wedstrijd is niets live geregistreerd.
        </p>
      ) : (
        <>
          {/* Doelpuntenmakers */}
          {doelpuntenmakers.length > 0 && (
            <div className="mb-4 rounded-xl border border-neutral-200 bg-white p-4">
              <h2 className="mb-1 text-sm font-semibold text-neutral-700">Doelpuntenmakers</h2>
              <p className="text-sm text-neutral-800">
                {doelpuntenmakers.map(([sid, n], i) => (
                  <span key={sid}>
                    {i > 0 && " · "}
                    {naamVan.get(sid)?.naam ?? "?"}{n > 1 ? ` (${n}×)` : ""}
                  </span>
                ))}
              </p>
            </div>
          )}

          {/* Verloop */}
          <h2 className="mb-2 text-sm font-semibold text-neutral-700">Verloop</h2>
          <ul className="mb-6 space-y-1.5">
            {tijdlijn.map((e) => (
              <li key={e.id} className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-2.5 text-sm print:break-inside-avoid">
                <span className="w-10 text-center font-bold tabular-nums text-sparta">{e.minuut}&apos;</span>
                <span className="flex-1">
                  {LABEL[e.type] ?? e.type}
                  {e.speler && <span className="ml-1 font-medium text-neutral-800">· {e.speler}</span>}
                </span>
                {e.stand && (
                  <span className="rounded bg-neutral-100 px-2 py-0.5 font-bold tabular-nums text-neutral-700">{e.stand}</span>
                )}
              </li>
            ))}
          </ul>

          {/* Speelminuten */}
          {reg.length > 0 && (
            <>
              <h2 className="mb-2 text-sm font-semibold text-neutral-700">Speelminuten</h2>
              <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500">
                      <th className="px-3 py-2">Speler</th>
                      <th className="px-2 py-2">Start</th>
                      <th className="px-2 py-2 text-right">Min</th>
                      <th className="px-2 py-2 text-right">⚽</th>
                      <th className="px-2 py-2 text-right">🅰️</th>
                      <th className="px-2 py-2 text-right">🟨/🟥</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reg.map((r) => {
                      const s = naamVan.get(r.speler_id);
                      return (
                        <tr key={r.speler_id} className="border-b border-neutral-100 last:border-0">
                          <td className="whitespace-nowrap px-3 py-1.5">
                            <span className="font-semibold text-neutral-400">{s?.rugnummer ?? "–"}</span>
                            <span className="ml-2 font-medium text-neutral-800">{s?.naam ?? "?"}</span>
                          </td>
                          <td className="px-2 py-1.5 text-neutral-500">
                            {r.startte_als === "basis" ? "Basis" : r.ingevallen ? "Ingevallen" : "Bank"}
                          </td>
                          <td className="px-2 py-1.5 text-right tabular-nums">{r.speelminuten}</td>
                          <td className="px-2 py-1.5 text-right tabular-nums">{r.goals || ""}</td>
                          <td className="px-2 py-1.5 text-right tabular-nums">{r.assists || ""}</td>
                          <td className="px-2 py-1.5 text-right tabular-nums">
                            {r.gele_kaarten > 0 && `${r.gele_kaarten}🟨`}
                            {r.rode_kaart && " 🟥"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      {/* Teamverslag: hoe speelden wij als team. Tijdens of na de wedstrijd
          in te vullen; 1 verslag per wedstrijd, door alle trainers te lezen. */}
      <form action={bewaarWedstrijdVerslag} className="mt-8 rounded-xl border border-neutral-200 bg-white p-4">
        <input type="hidden" name="wedstrijd_id" value={id} />
        <h2 className="text-sm font-semibold text-neutral-700">Teamverslag</h2>
        <p className="mb-3 mt-0.5 text-xs text-neutral-400">
          Hoe speelden wij als team? Tijdens de rust of na afloop invullen.
        </p>
        <label className="mb-3 block text-sm">
          <span className="mb-1 block text-xs font-semibold text-neutral-500">Wat ging goed</span>
          <textarea name="ging_goed" rows={3} defaultValue={verslag?.ging_goed ?? ""} className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm" />
        </label>
        <label className="mb-3 block text-sm">
          <span className="mb-1 block text-xs font-semibold text-neutral-500">Wat kan beter</span>
          <textarea name="kan_beter" rows={3} defaultValue={verslag?.kan_beter ?? ""} className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm" />
        </label>
        <label className="mb-3 block text-sm">
          <span className="mb-1 block text-xs font-semibold text-neutral-500">Meenemen naar de training</span>
          <textarea name="voor_training" rows={2} defaultValue={verslag?.voor_training ?? ""} className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm" />
        </label>
        <button type="submit" className="rounded-lg bg-sparta px-4 py-1.5 text-sm font-semibold text-white hover:bg-sparta-dark">
          Teamverslag opslaan
        </button>
      </form>

      {/* Tegenstander-scouting: 1 per wedstrijd. Handig voor de returnwedstrijd. */}
      <form action={bewaarScouting} className="mt-6 rounded-xl border border-neutral-200 bg-white p-4">
        <input type="hidden" name="wedstrijd_id" value={id} />
        <h2 className="text-sm font-semibold text-neutral-700">Tegenstander · {w.tegenstander}</h2>
        <p className="mb-3 mt-0.5 text-xs text-neutral-400">
          Scouting voor de returnwedstrijd: hoe speelden zij?
        </p>
        <div className="mb-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-semibold text-neutral-500">Systeem</span>
            <input type="text" name="systeem_tegenstander" placeholder="bijv. 4-4-2" defaultValue={scouting?.systeem_tegenstander ?? ""} className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-semibold text-neutral-500">Druk zetten</span>
            <select name="drukzetten" defaultValue={scouting?.drukzetten ?? ""} className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm">
              <option value="">—</option>
              <option value="hoog">Hoog druk zetten</option>
              <option value="inzakken">Inzakken</option>
              <option value="wisselend">Wisselend</option>
            </select>
          </label>
        </div>
        <label className="mb-3 block text-sm">
          <span className="mb-1 block text-xs font-semibold text-neutral-500">Omschakeling &amp; counter</span>
          <textarea name="omschakeling" rows={2} placeholder="Hoe schakelen ze om na balverlies/balverovering? Countergevaar?" defaultValue={scouting?.omschakeling ?? ""} className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm" />
        </label>
        <label className="mb-3 block text-sm">
          <span className="mb-1 block text-xs font-semibold text-neutral-500">Vaste spelmomenten</span>
          <textarea name="standaardsituaties" rows={2} placeholder="Corners, vrije trappen, inworpen, uittrap keeper…" defaultValue={scouting?.standaardsituaties ?? ""} className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm" />
        </label>
        <div className="mb-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-semibold text-neutral-500">Opvallend sterk</span>
            <textarea name="uitblinkers" rows={2} placeholder="Gevaarlijke/sterke spelers (rugnummers)" defaultValue={scouting?.uitblinkers ?? ""} className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-semibold text-neutral-500">Opvallend zwak</span>
            <textarea name="zwakke_schakel" rows={2} placeholder="Zwakke schakel / waar valt winst te halen" defaultValue={scouting?.zwakke_schakel ?? ""} className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm" />
          </label>
        </div>
        <label className="mb-3 block text-sm">
          <span className="mb-1 block text-xs font-semibold text-neutral-500">Overige opmerkingen</span>
          <textarea name="eigen_opmerking" rows={2} defaultValue={scouting?.eigen_opmerking ?? ""} className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm" />
        </label>
        <button type="submit" className="rounded-lg bg-sparta px-4 py-1.5 text-sm font-semibold text-white hover:bg-sparta-dark">
          Scouting opslaan
        </button>
      </form>
    </main>
  );
}
