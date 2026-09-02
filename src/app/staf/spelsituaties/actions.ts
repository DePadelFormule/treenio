"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getHuidigeGebruiker } from "@/lib/auth";
import type { PlayData } from "@/lib/tactiek/types";

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
  data: PlayData;
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

export interface SpelsituatieKort {
  id: string;
  titel: string;
  uitleg: string | null;
  half_veld: boolean;
  data: unknown;
}

/** Alle spelsituaties, nieuwste eerst. Voor de kiezer in het lesformulier. */
export async function lijstSpelsituaties(): Promise<SpelsituatieKort[]> {
  const gebruiker = await getHuidigeGebruiker();
  if (gebruiker?.rol !== "staf") return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("spelsituaties")
    .select("id, titel, uitleg, half_veld, data")
    .order("created_at", { ascending: false });
  return (data ?? []) as SpelsituatieKort[];
}

/** Eén spelsituatie, om in een les af te spelen. */
export async function haalSpelsituatie(id: string): Promise<SpelsituatieKort | null> {
  const gebruiker = await getHuidigeGebruiker();
  if (gebruiker?.rol !== "staf") return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("spelsituaties")
    .select("id, titel, uitleg, half_veld, data")
    .eq("id", id)
    .maybeSingle();
  return (data as SpelsituatieKort | null) ?? null;
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
