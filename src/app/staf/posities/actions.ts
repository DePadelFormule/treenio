"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getHuidigeGebruiker } from "@/lib/auth";
import type { PositieVoorkeur, Systeem } from "@/lib/types/database";

// Eén rij (speler + systeem) van de ingelogde trainer opslaan. De staf_id
// wordt server-side afgeleid uit de ingelogde gebruiker — een trainer kan
// dus nooit namens een ander invullen.
export async function setVoorkeur(
  speler_id: string,
  systeem: Systeem,
  waarden: { positie_1: string | null; positie_2: string | null; positie_3: string | null },
) {
  const gebruiker = await getHuidigeGebruiker();
  if (gebruiker?.rol !== "staf" || !gebruiker.staf) return { ok: false };

  const supabase = await createClient();

  const leeg = !waarden.positie_1 && !waarden.positie_2 && !waarden.positie_3;
  if (leeg) {
    // Niets ingevuld → eventuele bestaande rij verwijderen.
    const { error } = await supabase
      .from("positie_voorkeuren")
      .delete()
      .eq("staf_id", gebruiker.staf.id)
      .eq("speler_id", speler_id)
      .eq("systeem", systeem);
    return { ok: !error };
  }

  const { error } = await supabase.from("positie_voorkeuren").upsert(
    {
      staf_id: gebruiker.staf.id,
      speler_id,
      systeem,
      positie_1: waarden.positie_1,
      positie_2: waarden.positie_2,
      positie_3: waarden.positie_3,
    } as never,
    { onConflict: "staf_id,speler_id,systeem" },
  );

  revalidatePath("/staf/posities");
  revalidatePath("/staf/posities/conclusie");
  return { ok: !error };
}

// Schrijft de conclusie van de positie-inventarisatie naar de spelerskaarten:
// per speler de drie sterkste posities (1e keus = 3 punten, 2e = 2, 3e = 1,
// opgeteld over alle trainers en beide systemen) in hoofdpositie en de twee
// alternatieven. Alleen de hoofdtrainer; overschrijft bestaande waarden voor
// spelers waarop gestemd is, andere spelers blijven ongemoeid.
export async function zetConclusieInSpelerskaarten(): Promise<{
  ok: boolean;
  bericht: string;
}> {
  const gebruiker = await getHuidigeGebruiker();
  if (gebruiker?.rol !== "staf" || !gebruiker.staf?.mag_conclusie) {
    return { ok: false, bericht: "Geen toegang." };
  }

  const supabase = await createClient();
  const { data: voorkeuren } = await supabase.from("positie_voorkeuren").select("*");
  const vk = (voorkeuren ?? []) as PositieVoorkeur[];
  if (vk.length === 0) {
    return { ok: false, bericht: "Er zijn nog geen ingevulde posities." };
  }

  // punten per speler per positiecode, over beide systemen heen
  const score = new Map<string, Map<string, number>>();
  for (const v of vk) {
    const m = score.get(v.speler_id) ?? new Map<string, number>();
    if (v.positie_1) m.set(v.positie_1, (m.get(v.positie_1) ?? 0) + 3);
    if (v.positie_2) m.set(v.positie_2, (m.get(v.positie_2) ?? 0) + 2);
    if (v.positie_3) m.set(v.positie_3, (m.get(v.positie_3) ?? 0) + 1);
    score.set(v.speler_id, m);
  }

  let bijgewerkt = 0;
  for (const [spelerId, m] of score) {
    const top = [...m.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([code]) => code);
    if (top.length === 0) continue;
    const { error } = await supabase
      .from("spelers")
      .update({
        hoofdpositie: top[0] ?? null,
        alt_positie_1: top[1] ?? null,
        alt_positie_2: top[2] ?? null,
      } as never)
      .eq("id", spelerId);
    if (!error) bijgewerkt++;
  }

  revalidatePath("/staf/spelers");
  revalidatePath("/staf/team");
  return {
    ok: true,
    bericht: `Posities ingevuld op ${bijgewerkt} spelerskaart${bijgewerkt === 1 ? "" : "en"}.`,
  };
}
