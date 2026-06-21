"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getHuidigeGebruiker } from "@/lib/auth";
import { leesKnvbConfig, fetchProgramma } from "@/lib/knvb";

export interface ImportResultaat {
  ok: boolean;
  bericht: string;
}

// Haalt het wedstrijdprogramma op uit de KNVB Dataservice en zet het in de
// wedstrijden-tabel (upsert op bron_id, dus idempotent).
export async function importeerProgramma(): Promise<ImportResultaat> {
  const gebruiker = await getHuidigeGebruiker();
  if (gebruiker?.rol !== "staf") return { ok: false, bericht: "Geen toegang." };

  const config = leesKnvbConfig();
  if (!config) {
    return {
      ok: false,
      bericht:
        "KNVB-koppeling nog niet ingesteld. Zet KNVB_PROGRAMMA_URL (en eventueel KNVB_TEAM_CODE) in de omgeving.",
    };
  }

  let resultaat;
  try {
    resultaat = await fetchProgramma(config);
  } catch (e) {
    return { ok: false, bericht: `Ophalen mislukt: ${(e as Error).message}` };
  }

  if (resultaat.wedstrijden.length === 0) {
    const hint = resultaat.voorbeeldSleutels
      ? ` Ontvangen velden: ${resultaat.voorbeeldSleutels.join(", ")}.`
      : "";
    return { ok: false, bericht: `Geen wedstrijden herkend.${hint}` };
  }

  const supabase = await createClient();
  // Rijen met een bron_id upserten op bron_id; rijen zonder bron_id invoegen.
  const metBron = resultaat.wedstrijden.filter((w) => w.bron_id);
  const zonderBron = resultaat.wedstrijden.filter((w) => !w.bron_id);

  if (metBron.length) {
    const { error } = await supabase
      .from("wedstrijden")
      .upsert(metBron as never, { onConflict: "bron_id" });
    if (error) return { ok: false, bericht: `Opslaan mislukt: ${error.message}` };
  }
  if (zonderBron.length) {
    await supabase.from("wedstrijden").insert(zonderBron as never);
  }

  revalidatePath("/staf/wedstrijden");
  return {
    ok: true,
    bericht: `${resultaat.wedstrijden.length} wedstrijden gesynchroniseerd.`,
  };
}

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
