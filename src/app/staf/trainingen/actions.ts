"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getHuidigeGebruiker } from "@/lib/auth";

export async function verwijderTraining(formData: FormData) {
  const gebruiker = await getHuidigeGebruiker();
  if (gebruiker?.rol !== "staf") return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  // Datum onthouden als uitzondering, zodat "Genereer di/do trainingen" deze
  // bewust verwijderde dag niet opnieuw aanmaakt.
  const { data: training } = await supabase
    .from("trainingen")
    .select("datum")
    .eq("id", id)
    .maybeSingle();
  const datum = (training as { datum: string } | null)?.datum;
  if (datum) {
    await supabase
      .from("training_uitzonderingen")
      .upsert({ datum } as never, { onConflict: "datum" });
  }

  await supabase.from("trainingen").delete().eq("id", id);
  revalidatePath("/staf/trainingen");
}

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

// Materiaal-check (scheenbeschermers/bidon) aan- of uitvinken voor één speler
// op één training. Eén vinkje voor beide samen.
export async function toggleMateriaal(
  training_id: string,
  speler_id: string,
  ontbreekt: boolean,
) {
  const gebruiker = await getHuidigeGebruiker();
  if (gebruiker?.rol !== "staf") return { ok: false };

  const supabase = await createClient();
  const { error } = await supabase
    .from("training_registraties")
    .upsert(
      { training_id, speler_id, materiaal_ontbreekt: ontbreekt } as never,
      { onConflict: "training_id,speler_id" },
    );
  return { ok: !error };
}

// Zet iedereen (geen gasten) op aanwezig voor alle trainingen in een maand
// vanaf een datum, maar alleen waar nog niets is ingevuld. Zo hoef je daarna
// alleen de afmeldingen nog aan te tikken. Geeft terug wat er gezet is,
// zodat het rooster op het scherm meteen kan bijwerken.
export async function zetIedereenAanwezig(maand: string, vanaf: string) {
  const leeg = [] as { training_id: string; speler_id: string }[];
  const gebruiker = await getHuidigeGebruiker();
  if (gebruiker?.rol !== "staf") return { ok: false, gezet: leeg };
  if (!/^\d{4}-\d{2}$/.test(maand) || !/^\d{4}-\d{2}-\d{2}$/.test(vanaf)) return { ok: false, gezet: leeg };

  const supabase = await createClient();
  const [{ data: trainingen }, { data: spelers }] = await Promise.all([
    supabase.from("trainingen").select("id").gte("datum", vanaf).lte("datum", `${maand}-31`),
    supabase.from("spelers").select("id, gast"),
  ]);
  const trainingIds = ((trainingen ?? []) as { id: string }[]).map((t) => t.id);
  const spelerIds = ((spelers ?? []) as { id: string; gast?: boolean | null }[]).filter((s) => !s.gast).map((s) => s.id);
  if (trainingIds.length === 0 || spelerIds.length === 0) return { ok: true, gezet: leeg };

  const { data: bestaand } = await supabase
    .from("training_registraties")
    .select("training_id, speler_id, status")
    .in("training_id", trainingIds);
  const alIngevuld = new Set(
    ((bestaand ?? []) as { training_id: string; speler_id: string; status: string | null }[])
      .filter((r) => r.status)
      .map((r) => `${r.training_id}:${r.speler_id}`),
  );

  const gezet: { training_id: string; speler_id: string }[] = [];
  for (const training_id of trainingIds) {
    for (const speler_id of spelerIds) {
      if (!alIngevuld.has(`${training_id}:${speler_id}`)) gezet.push({ training_id, speler_id });
    }
  }
  if (gezet.length > 0) {
    const { error } = await supabase
      .from("training_registraties")
      .upsert(gezet.map((g) => ({ ...g, status: "aanwezig", aanwezig: true })) as never, { onConflict: "training_id,speler_id" });
    if (error) return { ok: false, gezet: leeg };
  }
  revalidatePath("/staf/trainingen");
  return { ok: true, gezet };
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
  // Bestaande data én bewust verwijderde datums in deze maand overslaan.
  const [{ data: bestaand }, { data: uitzonderingen }] = await Promise.all([
    supabase.from("trainingen").select("datum").gte("datum", `${maand}-01`).lte("datum", `${maand}-31`),
    supabase.from("training_uitzonderingen").select("datum").gte("datum", `${maand}-01`).lte("datum", `${maand}-31`),
  ]);
  const alBekend = new Set(((bestaand ?? []) as { datum: string }[]).map((r) => r.datum));
  for (const u of (uitzonderingen ?? []) as { datum: string }[]) alBekend.add(u.datum);

  const nieuw = datums
    .filter((dt) => !alBekend.has(dt))
    .map((dt) => ({ datum: dt, type: "training" }));

  if (nieuw.length > 0) {
    await supabase.from("trainingen").insert(nieuw as never);
  }
  revalidatePath("/staf/trainingen");
}
