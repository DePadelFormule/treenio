"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getHuidigeGebruiker } from "@/lib/auth";

export interface OpstellingPayload {
  wedstrijd_id: string;
  formatie: string;
  veld: Record<string, string>;
  bank: string[];
}

export async function bewaarOpstelling(payload: OpstellingPayload) {
  const gebruiker = await getHuidigeGebruiker();
  if (gebruiker?.rol !== "staf") return { ok: false, error: "Geen toegang." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("wedstrijd_opstelling")
    .upsert(payload as never, { onConflict: "wedstrijd_id" });

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/staf/wedstrijd/${payload.wedstrijd_id}/opstelling`);
  return { ok: true };
}
