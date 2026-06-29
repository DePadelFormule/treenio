"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getHuidigeGebruiker } from "@/lib/auth";
import type { BordData } from "@/lib/types/database";

export async function nieuweSpelsituatie(formData: FormData) {
  const gebruiker = await getHuidigeGebruiker();
  if (gebruiker?.rol !== "staf") return;

  const titel = String(formData.get("titel") ?? "").trim();
  const half_veld = String(formData.get("half_veld") ?? "") === "half";
  if (!titel) return;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("spelsituaties")
    .insert({ titel, half_veld } as never)
    .select("id")
    .single();

  if (error || !data) {
    redirect("/staf/spelsituaties");
  }
  redirect(`/staf/spelsituaties/${(data as { id: string }).id}`);
}

export interface BewaarPayload {
  id: string;
  titel: string;
  uitleg: string | null;
  half_veld: boolean;
  data: BordData;
}

export async function bewaarSpelsituatie(payload: BewaarPayload) {
  const gebruiker = await getHuidigeGebruiker();
  if (gebruiker?.rol !== "staf") return { ok: false, error: "Geen toegang." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("spelsituaties")
    .update({
      titel: payload.titel,
      uitleg: payload.uitleg,
      half_veld: payload.half_veld,
      data: payload.data,
    } as never)
    .eq("id", payload.id);

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/staf/spelsituaties/${payload.id}`);
  return { ok: true };
}

export async function verwijderSpelsituatie(formData: FormData) {
  const gebruiker = await getHuidigeGebruiker();
  if (gebruiker?.rol !== "staf") return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("spelsituaties").delete().eq("id", id);
  revalidatePath("/staf/spelsituaties");
  redirect("/staf/spelsituaties");
}
