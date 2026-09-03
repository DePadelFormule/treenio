"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getHuidigeGebruiker } from "@/lib/auth";

const PAD = "/staf/materiaaldienst";
const WEEK = /^\d{4}-\d{2}-\d{2}$/;

async function staf() {
  const gebruiker = await getHuidigeGebruiker();
  return gebruiker?.rol === "staf";
}

/** Week afvinken (of weer openzetten). Het duo van dat moment wordt vastgelegd. */
export async function zetGedaan(week: string, gedaan: boolean, spelerA: string | null, spelerB: string | null) {
  if (!(await staf()) || !WEEK.test(week)) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase
    .from("materiaaldienst_weken")
    .upsert({ week_start: week, gedaan, speler_a: spelerA, speler_b: spelerB, vakantie: false } as never, { onConflict: "week_start" });
  revalidatePath(PAD);
  return { ok: !error };
}

/** Vakantieweek: geen dienst, het rooster schuift een week op. */
export async function zetVakantie(week: string, vakantie: boolean) {
  if (!(await staf()) || !WEEK.test(week)) return { ok: false };
  const supabase = await createClient();
  const { error } = vakantie
    ? await supabase
        .from("materiaaldienst_weken")
        .upsert({ week_start: week, vakantie: true, gedaan: false, handmatig: false, speler_a: null, speler_b: null } as never, { onConflict: "week_start" })
    : await supabase.from("materiaaldienst_weken").delete().eq("week_start", week);
  revalidatePath(PAD);
  return { ok: !error };
}

/** Handmatig een ander duo voor een week; die week ligt daarna vast. */
export async function zetDuo(week: string, spelerA: string, spelerB: string) {
  if (!(await staf()) || !WEEK.test(week) || !spelerA || !spelerB || spelerA === spelerB) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase
    .from("materiaaldienst_weken")
    .upsert({ week_start: week, speler_a: spelerA, speler_b: spelerB, handmatig: true, vakantie: false } as never, { onConflict: "week_start" });
  revalidatePath(PAD);
  return { ok: !error };
}

/** Terug naar het automatische rooster voor deze week. */
export async function herstelWeek(week: string) {
  if (!(await staf()) || !WEEK.test(week)) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase.from("materiaaldienst_weken").delete().eq("week_start", week);
  revalidatePath(PAD);
  return { ok: !error };
}
