"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getHuidigeGebruiker } from "@/lib/auth";

// Rugnummer van een speler wijzigen — tap-en-opslaan vanuit het team-overzicht.
export async function updateRugnummer(spelerId: string, rugnummer: string) {
  const gebruiker = await getHuidigeGebruiker();
  if (gebruiker?.rol !== "staf") return { ok: false };
  if (!spelerId) return { ok: false };

  const schoon = rugnummer.trim();
  const waarde = schoon === "" ? null : Number(schoon);
  if (waarde !== null && (!Number.isInteger(waarde) || waarde < 0 || waarde > 999)) {
    return { ok: false, fout: "Ongeldig rugnummer." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("spelers").update({ rugnummer: waarde } as never).eq("id", spelerId);
  revalidatePath("/staf/team");
  return { ok: !error };
}
