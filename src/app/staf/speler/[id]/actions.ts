"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getHuidigeGebruiker } from "@/lib/auth";

export async function nieuwAandachtspunt(formData: FormData) {
  const gebruiker = await getHuidigeGebruiker();
  if (gebruiker?.rol !== "staf") return;

  const speler_id = String(formData.get("speler_id") ?? "");
  const tekst = String(formData.get("tekst") ?? "").trim();
  if (!speler_id || !tekst) return;

  const supabase = await createClient();
  await supabase
    .from("aandachtspunten")
    .insert({ speler_id, tekst, coach_id: gebruiker.staf?.id ?? null } as never);
  revalidatePath(`/staf/speler/${speler_id}`);
}

export async function toggleAandachtspunt(formData: FormData) {
  const gebruiker = await getHuidigeGebruiker();
  if (gebruiker?.rol !== "staf") return;

  const id = String(formData.get("id") ?? "");
  const speler_id = String(formData.get("speler_id") ?? "");
  const opgelost = String(formData.get("opgelost") ?? "") === "true";
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("aandachtspunten").update({ opgelost } as never).eq("id", id);
  revalidatePath(`/staf/speler/${speler_id}`);
}

export async function updateBeschikbaarheid(formData: FormData) {
  const gebruiker = await getHuidigeGebruiker();
  if (gebruiker?.rol !== "staf") return;

  const speler_id = String(formData.get("speler_id") ?? "");
  if (!speler_id) return;

  const beschikbaarheid = String(formData.get("beschikbaarheid") ?? "fit");
  const blessure_notitie = String(formData.get("blessure_notitie") ?? "").trim() || null;

  const supabase = await createClient();
  await supabase
    .from("spelers")
    .update({ beschikbaarheid, blessure_notitie } as never)
    .eq("id", speler_id);
  revalidatePath(`/staf/speler/${speler_id}`);
  revalidatePath("/staf/team");
}

export async function updatePosities(formData: FormData) {
  const gebruiker = await getHuidigeGebruiker();
  if (gebruiker?.rol !== "staf") return;

  const speler_id = String(formData.get("speler_id") ?? "");
  if (!speler_id) return;

  const hoofdpositie = String(formData.get("hoofdpositie") ?? "").trim() || null;
  const alt_positie_1 = String(formData.get("alt_positie_1") ?? "").trim() || null;
  const alt_positie_2 = String(formData.get("alt_positie_2") ?? "").trim() || null;

  const supabase = await createClient();
  await supabase
    .from("spelers")
    .update({ hoofdpositie, alt_positie_1, alt_positie_2 } as never)
    .eq("id", speler_id);
  revalidatePath(`/staf/speler/${speler_id}`);
  revalidatePath("/staf");
}
