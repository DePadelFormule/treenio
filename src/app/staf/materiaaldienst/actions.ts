"use server";

import { createClient } from "@/lib/supabase/server";
import { getHuidigeGebruiker } from "@/lib/auth";

// Eén vinkje (van speler 1 of 2) op een sessie zetten. Los per speler, zodat
// bijv. een blessure tijdens de training niet de hele duo blokkeert.
export async function toggleMateriaaldienstGedaan(
  sessie_id: string,
  welke: 1 | 2,
  waarde: boolean,
) {
  const gebruiker = await getHuidigeGebruiker();
  if (gebruiker?.rol !== "staf") return { ok: false };

  const supabase = await createClient();
  const kolom = welke === 1 ? "speler_1_gedaan" : "speler_2_gedaan";
  const { error } = await supabase
    .from("materiaaldienst_sessies")
    .update({ [kolom]: waarde } as never)
    .eq("id", sessie_id);
  return { ok: !error };
}

// Vult ontbrekende sessies aan: voor elke training/wedstrijd zonder rij in
// materiaaldienst_sessies wordt een duo toegewezen, doorlopend op het
// alfabet (geen gastspelers). Idempotent: draait veilig elke keer de pagina
// geladen wordt.
export async function genereerMateriaaldienst() {
  const gebruiker = await getHuidigeGebruiker();
  if (gebruiker?.rol !== "staf") return { ok: false };

  const supabase = await createClient();
  const [{ data: trainingen }, { data: wedstrijden }, { data: spelers }, { data: bestaand }] =
    await Promise.all([
      supabase.from("trainingen").select("id, datum"),
      supabase.from("wedstrijden").select("id, datum"),
      supabase.from("spelers").select("id, naam, gast"),
      supabase.from("materiaaldienst_sessies").select("training_id, wedstrijd_id, volgorde"),
    ]);

  const spelerLijst = ((spelers ?? []) as { id: string; naam: string; gast?: boolean | null }[])
    .filter((s) => !s.gast)
    .sort((a, b) => a.naam.localeCompare(b.naam, "nl"));
  if (spelerLijst.length < 2) return { ok: true };

  const bekend = (bestaand ?? []) as { training_id: string | null; wedstrijd_id: string | null; volgorde: number }[];
  const bekendeTrainingen = new Set(bekend.map((b) => b.training_id).filter(Boolean));
  const bekendeWedstrijden = new Set(bekend.map((b) => b.wedstrijd_id).filter(Boolean));
  const volgendeVolgorde = bekend.reduce((max, b) => Math.max(max, b.volgorde + 1), 0);

  type NieuweSessie = { id: string; datum: string; training: boolean };
  const nieuw: NieuweSessie[] = [
    ...((trainingen ?? []) as { id: string; datum: string }[])
      .filter((t) => !bekendeTrainingen.has(t.id))
      .map((t) => ({ id: t.id, datum: t.datum, training: true })),
    ...((wedstrijden ?? []) as { id: string; datum: string }[])
      .filter((w) => !bekendeWedstrijden.has(w.id))
      .map((w) => ({ id: w.id, datum: w.datum, training: false })),
  ].sort((a, b) => a.datum.localeCompare(b.datum));

  if (nieuw.length === 0) return { ok: true };

  const n = spelerLijst.length;
  const rijen = nieuw.map((s, i) => {
    const volgorde = volgendeVolgorde + i;
    const p1 = spelerLijst[(volgorde * 2) % n];
    const p2 = spelerLijst[(volgorde * 2 + 1) % n];
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
