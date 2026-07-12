"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getHuidigeGebruiker } from "@/lib/auth";
import type { Systeem } from "@/lib/types/database";

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
