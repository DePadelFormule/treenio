"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getHuidigeGebruiker } from "@/lib/auth";

export interface ActieResultaat {
  ok: boolean;
  error?: string;
}

export interface TrainingRegPayload {
  training_id: string;
  speler_id: string;
  aanwezig: boolean;
  op_tijd: boolean | null;
  afmeld_status: string;
  inzet: number | null;
}

export async function upsertTrainingRegistratie(
  payload: TrainingRegPayload,
): Promise<ActieResultaat> {
  const gebruiker = await getHuidigeGebruiker();
  if (gebruiker?.rol !== "staf") return { ok: false, error: "Geen toegang." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("training_registraties")
    .upsert(payload as never, { onConflict: "training_id,speler_id" });

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/staf/training/${payload.training_id}`);
  return { ok: true };
}
