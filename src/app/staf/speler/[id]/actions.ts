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

// Directe aanroep vanuit een client component (useTransition) in plaats van
// een native form-post: de nieuwe status staat al in de client-state, dus we
// hoeven deze pagina niet opnieuw op te halen om hem te tonen. Voorkomt de
// "valt terug naar de oude waarde"-bug die dezelfde soort form eerder gaf bij
// de teamtaken op de opstelling-pagina.
export async function updateBeschikbaarheid(
  spelerId: string,
  beschikbaarheid: string,
  blessureNotitie: string,
) {
  const gebruiker = await getHuidigeGebruiker();
  if (gebruiker?.rol !== "staf") return { ok: false };
  if (!spelerId) return { ok: false };
  if (!["fit", "twijfel", "geblesseerd"].includes(beschikbaarheid)) return { ok: false };

  const supabase = await createClient();
  const { error } = await supabase
    .from("spelers")
    .update({ beschikbaarheid, blessure_notitie: blessureNotitie.trim() || null } as never)
    .eq("id", spelerId);
  if (error) return { ok: false, fout: error.message };

  // Alleen elders (team-overzicht) hoeft de cache echt vernieuwd — deze
  // pagina zelf toont de zojuist opgeslagen waarde al lokaal.
  revalidatePath("/staf/team");
  return { ok: true };
}

// Ontwikkeldoel toevoegen — handmatig, of met tekst die al uit de
// seizoensstart-vragenlijst is overgenomen (bijv. "doel voor dit seizoen").
export async function nieuwOntwikkeldoel(spelerId: string, doel: string) {
  const gebruiker = await getHuidigeGebruiker();
  if (gebruiker?.rol !== "staf") return { ok: false as const };
  const schoon = doel.trim().slice(0, 500);
  if (!spelerId || !schoon) return { ok: false as const };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ontwikkeldoelen")
    .insert({
      speler_id: spelerId,
      doel: schoon,
      status: "open",
      afgesproken_op: new Date().toISOString().slice(0, 10),
      coach_id: gebruiker.staf?.id ?? null,
    } as never)
    .select("*")
    .single();
  if (error || !data) return { ok: false as const };
  revalidatePath(`/staf/speler/${spelerId}`);
  return { ok: true as const, doel: data as import("@/lib/types/database").Ontwikkeldoel };
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
