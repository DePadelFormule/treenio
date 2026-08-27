"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getHuidigeGebruiker } from "@/lib/auth";
import type { AcademyVraagType } from "@/lib/types/database";

// ---- Hoofdstukken ----------------------------------------------------------

export async function nieuwHoofdstuk(formData: FormData) {
  const gebruiker = await getHuidigeGebruiker();
  if (gebruiker?.rol !== "staf") return;
  const titel = String(formData.get("titel") ?? "").trim().slice(0, 120);
  if (!titel) return;

  const supabase = await createClient();
  const { data: max } = await supabase
    .from("academy_hoofdstukken").select("volgorde").order("volgorde", { ascending: false }).limit(1).maybeSingle();
  const volgorde = ((max as { volgorde: number } | null)?.volgorde ?? 0) + 1;

  const { data, error } = await supabase
    .from("academy_hoofdstukken").insert({ titel, volgorde } as never).select("id").single();
  revalidatePath("/staf/academy");
  if (error || !data) redirect("/staf/academy");
  redirect(`/staf/academy/${(data as { id: string }).id}`);
}

export async function bewaarHoofdstuk(id: string, titel: string, volgorde: number) {
  const gebruiker = await getHuidigeGebruiker();
  if (gebruiker?.rol !== "staf") return { ok: false };
  const schoon = titel.trim().slice(0, 120);
  if (!id || !schoon) return { ok: false };

  const supabase = await createClient();
  const { error } = await supabase
    .from("academy_hoofdstukken").update({ titel: schoon, volgorde } as never).eq("id", id);
  revalidatePath("/staf/academy");
  revalidatePath(`/staf/academy/${id}`);
  return { ok: !error };
}

export async function verwijderHoofdstuk(formData: FormData) {
  const gebruiker = await getHuidigeGebruiker();
  if (gebruiker?.rol !== "staf") return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("academy_hoofdstukken").delete().eq("id", id);
  revalidatePath("/staf/academy");
  redirect("/staf/academy");
}

// ---- Secties ----------------------------------------------------------------

export async function nieuweSectie(hoofdstukId: string, titel: string, tekst: string) {
  const gebruiker = await getHuidigeGebruiker();
  if (gebruiker?.rol !== "staf") return { ok: false };
  if (!hoofdstukId) return { ok: false };

  const supabase = await createClient();
  const { data: max } = await supabase
    .from("academy_secties").select("volgorde").eq("hoofdstuk_id", hoofdstukId)
    .order("volgorde", { ascending: false }).limit(1).maybeSingle();
  const volgorde = ((max as { volgorde: number } | null)?.volgorde ?? 0) + 1;

  const { error } = await supabase.from("academy_secties").insert({
    hoofdstuk_id: hoofdstukId,
    titel: titel.trim().slice(0, 120) || null,
    tekst: tekst.trim().slice(0, 8000),
    volgorde,
  } as never);
  revalidatePath(`/staf/academy/${hoofdstukId}`);
  return { ok: !error };
}

export async function bewaarSectie(id: string, hoofdstukId: string, titel: string, tekst: string, volgorde: number) {
  const gebruiker = await getHuidigeGebruiker();
  if (gebruiker?.rol !== "staf") return { ok: false };
  if (!id) return { ok: false };

  const supabase = await createClient();
  const { error } = await supabase.from("academy_secties").update({
    titel: titel.trim().slice(0, 120) || null,
    tekst: tekst.trim().slice(0, 8000),
    volgorde,
  } as never).eq("id", id);
  revalidatePath(`/staf/academy/${hoofdstukId}`);
  return { ok: !error };
}

export async function verwijderSectie(id: string, hoofdstukId: string) {
  const gebruiker = await getHuidigeGebruiker();
  if (gebruiker?.rol !== "staf") return { ok: false };
  if (!id) return { ok: false };

  const supabase = await createClient();
  const { error } = await supabase.from("academy_secties").delete().eq("id", id);
  revalidatePath(`/staf/academy/${hoofdstukId}`);
  return { ok: !error };
}

// ---- Quizvragen ---------------------------------------------------------------

function schoonmakenOpties(opties: string[]): string[] {
  return opties.map((o) => o.trim().slice(0, 200)).filter(Boolean).slice(0, 6);
}

export async function nieuweVraag(
  hoofdstukId: string,
  type: AcademyVraagType,
  vraag: string,
  opties: string[],
  juistIndex: number,
) {
  const gebruiker = await getHuidigeGebruiker();
  if (gebruiker?.rol !== "staf") return { ok: false, fout: "Geen toegang." };
  const schoneVraag = vraag.trim().slice(0, 500);
  const schoneOpties = schoonmakenOpties(opties);
  if (!hoofdstukId || !schoneVraag) return { ok: false, fout: "Vul de vraag in." };
  if (schoneOpties.length < 2) return { ok: false, fout: "Minstens 2 antwoordopties nodig." };
  if (juistIndex < 0 || juistIndex >= schoneOpties.length) return { ok: false, fout: "Kies het juiste antwoord." };

  const supabase = await createClient();
  const { data: max } = await supabase
    .from("academy_quizvragen").select("volgorde").eq("hoofdstuk_id", hoofdstukId)
    .order("volgorde", { ascending: false }).limit(1).maybeSingle();
  const volgorde = ((max as { volgorde: number } | null)?.volgorde ?? 0) + 1;

  const { error } = await supabase.from("academy_quizvragen").insert({
    hoofdstuk_id: hoofdstukId, type, vraag: schoneVraag, opties: schoneOpties, juist_index: juistIndex, volgorde,
  } as never);
  revalidatePath(`/staf/academy/${hoofdstukId}`);
  return { ok: !error, fout: error?.message };
}

export async function bewaarVraag(
  id: string,
  hoofdstukId: string,
  type: AcademyVraagType,
  vraag: string,
  opties: string[],
  juistIndex: number,
) {
  const gebruiker = await getHuidigeGebruiker();
  if (gebruiker?.rol !== "staf") return { ok: false, fout: "Geen toegang." };
  const schoneVraag = vraag.trim().slice(0, 500);
  const schoneOpties = schoonmakenOpties(opties);
  if (!id || !schoneVraag) return { ok: false, fout: "Vul de vraag in." };
  if (schoneOpties.length < 2) return { ok: false, fout: "Minstens 2 antwoordopties nodig." };
  if (juistIndex < 0 || juistIndex >= schoneOpties.length) return { ok: false, fout: "Kies het juiste antwoord." };

  const supabase = await createClient();
  const { error } = await supabase.from("academy_quizvragen").update({
    type, vraag: schoneVraag, opties: schoneOpties, juist_index: juistIndex,
  } as never).eq("id", id);
  revalidatePath(`/staf/academy/${hoofdstukId}`);
  return { ok: !error, fout: error?.message };
}

export async function verwijderVraag(id: string, hoofdstukId: string) {
  const gebruiker = await getHuidigeGebruiker();
  if (gebruiker?.rol !== "staf") return { ok: false };
  if (!id) return { ok: false };

  const supabase = await createClient();
  const { error } = await supabase.from("academy_quizvragen").delete().eq("id", id);
  revalidatePath(`/staf/academy/${hoofdstukId}`);
  return { ok: !error };
}
