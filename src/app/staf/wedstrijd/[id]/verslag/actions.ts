"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getHuidigeGebruiker } from "@/lib/auth";

function veld(formData: FormData, naam: string): string | null {
  const v = String(formData.get(naam) ?? "").trim();
  return v ? v.slice(0, 2000) : null;
}

// Teamverslag (1 per wedstrijd): wat ging goed, wat kan beter, wat nemen we
// mee naar de training.
export async function bewaarWedstrijdVerslag(formData: FormData) {
  const gebruiker = await getHuidigeGebruiker();
  if (gebruiker?.rol !== "staf") return;
  const wedstrijdId = String(formData.get("wedstrijd_id") ?? "");
  if (!wedstrijdId) return;

  const supabase = await createClient();
  await supabase.from("wedstrijd_verslag").upsert(
    {
      wedstrijd_id: wedstrijdId,
      ging_goed: veld(formData, "ging_goed"),
      kan_beter: veld(formData, "kan_beter"),
      voor_training: veld(formData, "voor_training"),
    } as never,
    { onConflict: "wedstrijd_id" },
  );
  revalidatePath(`/staf/wedstrijd/${wedstrijdId}/verslag`);
}

// Tegenstander-scouting (1 per wedstrijd).
export async function bewaarScouting(formData: FormData) {
  const gebruiker = await getHuidigeGebruiker();
  if (gebruiker?.rol !== "staf") return;
  const wedstrijdId = String(formData.get("wedstrijd_id") ?? "");
  if (!wedstrijdId) return;

  const drukRaw = String(formData.get("drukzetten") ?? "");
  const drukzetten = ["hoog", "inzakken", "wisselend"].includes(drukRaw) ? drukRaw : null;
  const basis = {
    wedstrijd_id: wedstrijdId,
    systeem_tegenstander: veld(formData, "systeem_tegenstander"),
    drukzetten,
    zwakke_schakel: veld(formData, "zwakke_schakel"),
    uitblinkers: veld(formData, "uitblinkers"),
    eigen_opmerking: veld(formData, "eigen_opmerking"),
  };

  const supabase = await createClient();
  const { error } = await supabase.from("wedstrijd_scouting").upsert(
    {
      ...basis,
      omschakeling: veld(formData, "omschakeling"),
      standaardsituaties: veld(formData, "standaardsituaties"),
    } as never,
    { onConflict: "wedstrijd_id" },
  );
  if (error) {
    // Vóór migratie 0024 bestaan omschakeling/standaardsituaties nog niet.
    await supabase.from("wedstrijd_scouting").upsert(basis as never, { onConflict: "wedstrijd_id" });
  }
  revalidatePath(`/staf/wedstrijd/${wedstrijdId}/verslag`);
}
