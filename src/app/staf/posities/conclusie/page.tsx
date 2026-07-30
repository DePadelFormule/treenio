import Link from "next/link";
import { redirect } from "next/navigation";
import { getHuidigeGebruiker } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { FORMATIES, SYSTEMEN } from "@/lib/posities";
import { ConclusieWeergave } from "@/components/ConclusieWeergave";
import type { ConclusiePerSysteem, SlotConclusie, StemRij, StemmenPerSysteem } from "@/components/ConclusieWeergave";
import type { PositieVoorkeur, Speler, Systeem } from "@/lib/types/database";

// Greedy toewijzing: bereken per (speler, code) een puntentotaal en vul elke
// plek met de best passende, nog niet geplaatste speler.
function ideaalElftal(
  systeem: Systeem,
  voorkeuren: PositieVoorkeur[],
  naamVan: Map<string, string>,
  rugVan: Map<string, number | null>,
): SlotConclusie[] {
  // score.get(spelerId).get(code) = punten
  const score = new Map<string, Map<string, number>>();
  const tel = (sid: string, code: string | null, gewicht: number) => {
    if (!code) return;
    if (!score.has(sid)) score.set(sid, new Map());
    const m = score.get(sid)!;
    m.set(code, (m.get(code) ?? 0) + gewicht);
  };
  for (const v of voorkeuren) {
    if (v.systeem !== systeem) continue;
    tel(v.speler_id, v.positie_1, 3);
    tel(v.speler_id, v.positie_2, 2);
    tel(v.speler_id, v.positie_3, 1);
  }

  const kandidaten: { sid: string; code: string; punten: number }[] = [];
  for (const [sid, m] of score) for (const [code, punten] of m) kandidaten.push({ sid, code, punten });
  // Hoogste punten eerst; bij gelijk een stabiele volgorde op naam.
  kandidaten.sort((a, b) => b.punten - a.punten || (naamVan.get(a.sid) ?? "").localeCompare(naamVan.get(b.sid) ?? ""));

  const gevuld = new Map<string, string>(); // code → sid
  const geplaatst = new Set<string>();
  for (const k of kandidaten) {
    if (gevuld.has(k.code) || geplaatst.has(k.sid)) continue;
    gevuld.set(k.code, k.sid);
    geplaatst.add(k.sid);
  }

  return FORMATIES[systeem].map((slot) => {
    const sid = gevuld.get(slot.code) ?? null;
    // Andere spelers die punten kregen op deze plek (niet de gekozene).
    const alt: { naam: string; punten: number }[] = [];
    for (const [s, m] of score) {
      if (s === sid) continue;
      const p = m.get(slot.code);
      if (p) alt.push({ naam: naamVan.get(s) ?? "?", punten: p });
    }
    alt.sort((a, b) => b.punten - a.punten);
    return {
      nr: slot.nr,
      code: slot.code,
      naam: slot.naam,
      x: slot.x,
      y: slot.y,
      speler: sid ? naamVan.get(sid) ?? null : null,
      rugnummer: sid ? rugVan.get(sid) ?? null : null,
      punten: sid ? score.get(sid)?.get(slot.code) ?? 0 : 0,
      kandidaten: alt.slice(0, 3),
    };
  });
}

// Ruwe telling per speler: hoe vaak elke positie is gekozen, waarbij 1e, 2e en
// 3e keus allemaal even zwaar tellen (1 stem).
function stemmenPerSpeler(
  systeem: Systeem,
  voorkeuren: PositieVoorkeur[],
  naamVan: Map<string, string>,
  rugVan: Map<string, number | null>,
): StemRij[] {
  const per = new Map<string, Map<string, number>>();
  for (const v of voorkeuren) {
    if (v.systeem !== systeem) continue;
    for (const code of [v.positie_1, v.positie_2, v.positie_3]) {
      if (!code) continue;
      if (!per.has(v.speler_id)) per.set(v.speler_id, new Map());
      const m = per.get(v.speler_id)!;
      m.set(code, (m.get(code) ?? 0) + 1);
    }
  }
  const rijen: StemRij[] = [...per.entries()].map(([sid, m]) => ({
    speler: naamVan.get(sid) ?? "?",
    rugnummer: rugVan.get(sid) ?? null,
    posities: [...m.entries()]
      .map(([code, keer]) => ({ code, keer }))
      .sort((a, b) => b.keer - a.keer || a.code.localeCompare(b.code)),
  }));
  rijen.sort((a, b) => (a.rugnummer ?? 999) - (b.rugnummer ?? 999) || a.speler.localeCompare(b.speler));
  return rijen;
}

export default async function ConclusiePage() {
  const gebruiker = await getHuidigeGebruiker();
  if (!gebruiker) redirect("/login");
  if (gebruiker.rol !== "staf" || !gebruiker.staf) redirect("/");
  // Alleen wie de conclusie mag zien (hoofdtrainer) komt hier binnen.
  if (!gebruiker.staf.mag_conclusie) redirect("/staf/posities");

  const supabase = await createClient();
  const [{ data: spelers }, { data: voorkeuren }] = await Promise.all([
    supabase.from("spelers").select("id, naam, rugnummer"),
    supabase.from("positie_voorkeuren").select("*"),
  ]);

  const naamVan = new Map<string, string>();
  const rugVan = new Map<string, number | null>();
  for (const s of (spelers ?? []) as Pick<Speler, "id" | "naam" | "rugnummer">[]) {
    naamVan.set(s.id, s.naam);
    rugVan.set(s.id, s.rugnummer);
  }

  const vk = (voorkeuren ?? []) as PositieVoorkeur[];
  const aantalTrainers = new Set(vk.map((v) => v.staf_id)).size;

  const data = {} as ConclusiePerSysteem;
  const stemmen = {} as StemmenPerSysteem;
  for (const s of SYSTEMEN) {
    data[s] = ideaalElftal(s, vk, naamVan, rugVan);
    stemmen[s] = stemmenPerSpeler(s, vk, naamVan, rugVan);
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 print:py-2">
      <div className="print:hidden">
        <Link href="/staf/posities" className="text-sm text-neutral-500 hover:text-sparta hover:underline">
          ← Terug naar invullen
        </Link>
        <h1 className="mb-1 mt-4 text-2xl font-bold text-sparta">Conclusie — ideaal elftal</h1>
        <p className="mb-2 text-sm text-neutral-500">
          De voorkeuren van alle trainers samengevoegd tot één opstelling per systeem.
        </p>
        <p className="mb-5 text-sm">
          <Link href="/staf/posities/overzicht" className="font-semibold text-sparta hover:underline">
            Bekijk de uitkomst per speler →
          </Link>
        </p>
      </div>

      {aantalTrainers === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-400">
          Nog geen enkele trainer heeft posities ingevuld.
        </p>
      ) : (
        <ConclusieWeergave data={data} stemmen={stemmen} aantalTrainers={aantalTrainers} />
      )}
    </main>
  );
}
