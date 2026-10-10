"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getHuidigeGebruiker } from "@/lib/auth";

function isDatum(v: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(v);
}

// Legt de huidige periode vast als een fase (naam + datumrange), zodat je 'm
// later terug kunt pakken en ermee kunt vergelijken.
export async function maakFase(formData: FormData) {
  const gebruiker = await getHuidigeGebruiker();
  if (gebruiker?.rol !== "staf") return;

  const naam = String(formData.get("naam") ?? "").trim().slice(0, 60);
  const van = String(formData.get("van") ?? "");
  const tot = String(formData.get("tot") ?? "");
  if (!naam || !isDatum(van) || !isDatum(tot)) return;

  const supabase = await createClient();
  await supabase.from("fases").insert({ naam, van, tot } as never);
  revalidatePath("/staf/faseoverzicht");
  redirect(`/staf/faseoverzicht?van=${van}&tot=${tot}`);
}

export async function verwijderFase(formData: FormData) {
  const gebruiker = await getHuidigeGebruiker();
  if (gebruiker?.rol !== "staf") return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("fases").delete().eq("id", id);
  revalidatePath("/staf/faseoverzicht");
}
