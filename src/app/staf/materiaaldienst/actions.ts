"use server";

import { createClient } from "@/lib/supabase/server";
import { getHuidigeGebruiker } from "@/lib/auth";

// Rooster gaat pas vanaf deze datum in.
const START_DATUM = "2026-09-01";

// Eén vinkje (halen of opruimen, van speler 1 of 2) op een sessie zetten.
// Los per speler én los per taak, zodat bijv. een blessure tijdens de
// training niet de hele duo blokkeert.
export async function toggleMateriaaldienstGedaan(
  sessie_id: string,
  welke: 1 | 2,
  taak: "halen" | "opruimen",
  waarde: boolean,
) {
  const gebruiker = await getHuidigeGebruiker();
  if (gebruiker?.rol !== "staf") return { ok: false };

  const supabase = await createClient();
  const kolom = `speler_${welke}_${taak}`;
  const { error } = await supabase
    .from("materiaaldienst_sessies")
    .update({ [kolom]: waarde } as never)
    .eq("id", sessie_id);
  return { ok: !error };
}

// Speler 1 of 2 van een sessie vervangen door iemand anders — voor als ze
// onderling ruilen en de dienst doorgeven.
export async function wijzigMateriaaldienstSpeler(
  sessie_id: string,
  welke: 1 | 2,
  speler_id: string,
) {
  const gebruiker = await getHuidigeGebruiker();
  if (gebruiker?.rol !== "staf") return { ok: false };

  const supabase = await createClient();
  const kolom = welke === 1 ? "speler_1_id" : "speler_2_id";
  const { error } = await supabase
    .from("materiaaldienst_sessies")
    .update({ [kolom]: speler_id } as never)
    .eq("id", sessie_id);
  return { ok: !error };
}

function voornaam(naam: string) {
  return naam.trim().split(/\s+/)[0].toLowerCase();
}

function maandagVan(datum: string) {
  const d = new Date(`${datum}T12:00:00Z`);
  const dag = d.getUTCDay(); // 0 = zondag
  const diff = dag === 0 ? -6 : 1 - dag;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

// Vult ontbrekende sessies aan (vanaf START_DATUM): voor elke training/wed-
// strijd zonder rij in materiaaldienst_sessies wordt een duo toegewezen.
// Het duo geldt per week (dezelfde twee spelers voor di/do/za), niet per
// sessie. De allereerste week is Rayhan + Amir, daarna alfabetisch verder.
// Idempotent: draait veilig elke keer de pagina geladen wordt.
export async function genereerMateriaaldienst() {
  const gebruiker = await getHuidigeGebruiker();
  if (gebruiker?.rol !== "staf") return { ok: false };

  const supabase = await createClient();
  const [{ data: trainingen }, { data: wedstrijden }, { data: spelers }, { data: bestaand }] =
    await Promise.all([
      supabase.from("trainingen").select("id, datum").gte("datum", START_DATUM),
      supabase.from("wedstrijden").select("id, datum").gte("datum", START_DATUM),
      supabase.from("spelers").select("id, naam, gast"),
      supabase.from("materiaaldienst_sessies").select("training_id, wedstrijd_id, volgorde"),
    ]);

  const alleSpelers = ((spelers ?? []) as { id: string; naam: string; gast?: boolean | null }[])
    .filter((s) => !s.gast);
  if (alleSpelers.length < 2) return { ok: true };

  // Rotatievolgorde: eerst Rayhan + Amir (deze week al gedaan), dan de rest
  // alfabetisch. Als een van beide namen niet gevonden wordt, gewoon
  // helemaal alfabetisch.
  const rayhan = alleSpelers.find((s) => voornaam(s.naam) === "rayhan");
  const amir = alleSpelers.find((s) => voornaam(s.naam) === "amir");
  const rest = alleSpelers
    .filter((s) => s.id !== rayhan?.id && s.id !== amir?.id)
    .sort((a, b) => a.naam.localeCompare(b.naam, "nl"));
  const rotatie = rayhan && amir ? [rayhan, amir, ...rest] : alleSpelers.sort((a, b) => a.naam.localeCompare(b.naam, "nl"));
  const n = rotatie.length;

  const trainingenLijst = (trainingen ?? []) as { id: string; datum: string }[];
  const wedstrijdenLijst = (wedstrijden ?? []) as { id: string; datum: string }[];
  const datumPerTraining = new Map(trainingenLijst.map((t) => [t.id, t.datum]));
  const datumPerWedstrijd = new Map(wedstrijdenLijst.map((w) => [w.id, w.datum]));

  const bekend = (bestaand ?? []) as { training_id: string | null; wedstrijd_id: string | null; volgorde: number }[];
  const bekendeTrainingen = new Set(bekend.map((b) => b.training_id).filter(Boolean));
  const bekendeWedstrijden = new Set(bekend.map((b) => b.wedstrijd_id).filter(Boolean));

  // Welke week hoort bij welk volgorde-nummer (duo), afgeleid uit wat al
  // bestaat, zodat een training en wedstrijd in dezelfde week hetzelfde duo
  // krijgen ook als ze niet in dezelfde generatieronde worden aangemaakt.
  const weekVolgorde = new Map<string, number>();
  let volgendeVolgorde = 0;
  for (const b of bekend) {
    volgendeVolgorde = Math.max(volgendeVolgorde, b.volgorde + 1);
    const datum = b.training_id ? datumPerTraining.get(b.training_id) : datumPerWedstrijd.get(b.wedstrijd_id ?? "");
    if (datum) weekVolgorde.set(maandagVan(datum), b.volgorde);
  }

  type NieuweSessie = { id: string; datum: string; training: boolean };
  const nieuw: NieuweSessie[] = [
    ...trainingenLijst.filter((t) => !bekendeTrainingen.has(t.id)).map((t) => ({ id: t.id, datum: t.datum, training: true })),
    ...wedstrijdenLijst.filter((w) => !bekendeWedstrijden.has(w.id)).map((w) => ({ id: w.id, datum: w.datum, training: false })),
  ].sort((a, b) => a.datum.localeCompare(b.datum));

  if (nieuw.length === 0) return { ok: true };

  const rijen = nieuw.map((s) => {
    const week = maandagVan(s.datum);
    let volgorde = weekVolgorde.get(week);
    if (volgorde === undefined) {
      volgorde = volgendeVolgorde++;
      weekVolgorde.set(week, volgorde);
    }
    const p1 = rotatie[(volgorde * 2) % n];
    const p2 = rotatie[(volgorde * 2 + 1) % n];
    return {
      training_id: s.training ? s.id : null,
      wedstrijd_id: s.training ? null : s.id,
      volgorde,
      speler_1_id: p1.id,
      speler_2_id: p2.id,
    };
  });

  const { error } = await supabase.from("materiaaldienst_sessies").insert(rijen as never);
  if (error) return { ok: false };
  return { ok: true };
}
