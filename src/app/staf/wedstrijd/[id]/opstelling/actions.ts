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

  // 1. De opstelling zelf opslaan.
  const { error } = await supabase
    .from("wedstrijd_opstelling")
    .upsert(payload as never, { onConflict: "wedstrijd_id" });
  if (error) return { ok: false, error: error.message };

  // 2. Basis/wissel/niet-in-selectie automatisch doorzetten naar de
  //    wedstrijdregistratie (alleen het veld startte_als — overige stats
  //    blijven staan dankzij de upsert op de unieke sleutel).
  const { data: spelers } = await supabase.from("spelers").select("id");
  const veldSet = new Set(Object.values(payload.veld).filter(Boolean));
  const bankSet = new Set(payload.bank);
  const rijen = ((spelers ?? []) as { id: string }[]).map((s) => ({
    wedstrijd_id: payload.wedstrijd_id,
    speler_id: s.id,
    startte_als: veldSet.has(s.id)
      ? "basis"
      : bankSet.has(s.id)
        ? "wissel"
        : "niet_in_selectie",
  }));
  if (rijen.length > 0) {
    await supabase
      .from("wedstrijd_registraties")
      .upsert(rijen as never, { onConflict: "wedstrijd_id,speler_id" });
  }

  revalidatePath(`/staf/wedstrijd/${payload.wedstrijd_id}/opstelling`);
  revalidatePath(`/staf/wedstrijd/${payload.wedstrijd_id}/registreren`);
  return { ok: true };
}
