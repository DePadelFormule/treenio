"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getHuidigeGebruiker } from "@/lib/auth";

export async function nieuweWedstrijd(formData: FormData) {
  const gebruiker = await getHuidigeGebruiker();
  if (gebruiker?.rol !== "staf") return;

  const datum = String(formData.get("datum") ?? "").trim();
  const tegenstander = String(formData.get("tegenstander") ?? "").trim();
  const uitslag = String(formData.get("uitslag") ?? "").trim() || null;
  if (!datum || !tegenstander) return;

  const supabase = await createClient();
  await supabase
    .from("wedstrijden")
    .insert({ datum, tegenstander, uitslag } as never);
  revalidatePath("/staf/wedstrijden");
}
