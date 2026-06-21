"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getHuidigeGebruiker } from "@/lib/auth";

export async function nieuweTraining(formData: FormData) {
  const gebruiker = await getHuidigeGebruiker();
  if (gebruiker?.rol !== "staf") return;

  const datum = String(formData.get("datum") ?? "").trim();
  const type = String(formData.get("type") ?? "").trim() || null;
  if (!datum) return;

  const supabase = await createClient();
  await supabase.from("trainingen").insert({ datum, type } as never);
  revalidatePath("/staf/trainingen");
}
