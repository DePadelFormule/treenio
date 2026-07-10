"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getHuidigeGebruiker } from "@/lib/auth";

// Presentie van één speler op één training zetten (of wissen bij status=null).
export async function setPresentie(
  training_id: string,
  speler_id: string,
  status: string | null,
) {
  const gebruiker = await getHuidigeGebruiker();
  if (gebruiker?.rol !== "staf") return { ok: false };

  const supabase = await createClient();
  const { error } = await supabase
    .from("training_registraties")
    .upsert(
      { training_id, speler_id, status, aanwezig: status === "aanwezig" } as never,
      { onConflict: "training_id,speler_id" },
    );
  return { ok: !error };
}

// Genereer alle dinsdag- en donderdagtrainingen voor een maand (YYYY-MM),
// zonder dubbele data aan te maken.
export async function genereerMaand(formData: FormData) {
  const gebruiker = await getHuidigeGebruiker();
  if (gebruiker?.rol !== "staf") return;

  const maand = String(formData.get("maand") ?? ""); // "2026-08"
  const m = maand.match(/^(\d{4})-(\d{2})$/);
  if (!m) return;
  const jaar = Number(m[1]);
  const maandIdx = Number(m[2]) - 1;

  // Alle di (2) en do (4) van die maand verzamelen.
  const datums: string[] = [];
  const d = new Date(Date.UTC(jaar, maandIdx, 1));
  while (d.getUTCMonth() === maandIdx) {
    const dag = d.getUTCDay();
    if (dag === 2 || dag === 4) {
      datums.push(d.toISOString().slice(0, 10));
    }
    d.setUTCDate(d.getUTCDate() + 1);
  }
  if (datums.length === 0) return;

  const supabase = await createClient();
  // Bestaande data in deze maand overslaan.
  const { data: bestaand } = await supabase
    .from("trainingen")
    .select("datum")
    .gte("datum", `${maand}-01`)
    .lte("datum", `${maand}-31`);
  const alBekend = new Set(((bestaand ?? []) as { datum: string }[]).map((r) => r.datum));

  const nieuw = datums
    .filter((dt) => !alBekend.has(dt))
    .map((dt) => ({ datum: dt, type: "training" }));

  if (nieuw.length > 0) {
    await supabase.from("trainingen").insert(nieuw as never);
  }
  revalidatePath("/staf/trainingen");
}
