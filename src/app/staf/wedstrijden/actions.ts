"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getHuidigeGebruiker } from "@/lib/auth";
import { leesKnvbConfig, fetchProgramma } from "@/lib/knvb";
import { parsePlakProgramma } from "@/lib/programmaParser";

export async function verwijderWedstrijd(formData: FormData) {
  const gebruiker = await getHuidigeGebruiker();
  if (gebruiker?.rol !== "staf") return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  // Cascade ruimt opstelling, events en registraties automatisch op.
  await supabase.from("wedstrijden").delete().eq("id", id);
  revalidatePath("/staf/wedstrijden");
  revalidatePath("/staf/team");
}

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

// Geplakt programma (voetbal.nl / club-app) verwerken: parse de tekst en voeg
// alle herkende wedstrijden toe. Bestaande (zelfde datum + tegenstander)
// worden overgeslagen, dus twee keer plakken kan geen kwaad.
export async function plakProgramma(tekst: string): Promise<ImportResultaat> {
  const gebruiker = await getHuidigeGebruiker();
  if (gebruiker?.rol !== "staf") return { ok: false, bericht: "Geen toegang." };

  const resultaat = parsePlakProgramma(tekst);
  if (resultaat.wedstrijden.length === 0) {
    return {
      ok: false,
      bericht:
        "Geen wedstrijden herkend. Plak regels met twee teamnamen gescheiden door “ - ” en een datum erbij of erboven.",
    };
  }

  const supabase = await createClient();
  const { data: bestaand } = await supabase.from("wedstrijden").select("id, datum, tegenstander, uitslag");
  const bestaandPer = new Map(
    ((bestaand ?? []) as { id: string; datum: string; tegenstander: string; uitslag: string | null }[]).map(
      (b) => [`${b.datum}|${b.tegenstander.toLowerCase()}`, b],
    ),
  );

  const nieuw: typeof resultaat.wedstrijden = [];
  let uitslagenBijgewerkt = 0;
  let overgeslagen = 0;

  for (const w of resultaat.wedstrijden) {
    const huidig = bestaandPer.get(`${w.datum}|${w.tegenstander.toLowerCase()}`);
    if (!huidig) {
      nieuw.push(w);
    } else if (w.uitslag && !huidig.uitslag) {
      // Bestond al zonder uitslag en de plak bevat er een → invullen. Een al
      // ingevulde uitslag (bijv. uit de live-registratie) laten we staan.
      const { error } = await supabase
        .from("wedstrijden")
        .update({ uitslag: w.uitslag } as never)
        .eq("id", huidig.id);
      if (!error) uitslagenBijgewerkt++;
    } else {
      overgeslagen++;
    }
  }

  if (nieuw.length > 0) {
    const { error } = await supabase
      .from("wedstrijden")
      .insert(nieuw.map((w) => ({ datum: w.datum, tegenstander: w.tegenstander, uitslag: w.uitslag })) as never);
    if (error) return { ok: false, bericht: `Opslaan mislukt: ${error.message}` };
  }

  revalidatePath("/staf/wedstrijden");
  revalidatePath("/staf/team");

  const delen = [`${nieuw.length} ${nieuw.length === 1 ? "wedstrijd" : "wedstrijden"} toegevoegd`];
  if (uitslagenBijgewerkt > 0)
    delen.push(`${uitslagenBijgewerkt} uitslag${uitslagenBijgewerkt === 1 ? "" : "en"} bijgewerkt`);
  if (overgeslagen > 0) delen.push(`${overgeslagen} ongewijzigd`);
  if (resultaat.zonderDatum > 0) delen.push(`${resultaat.zonderDatum} regel(s) zonder datum overgeslagen`);
  return {
    ok: nieuw.length > 0 || uitslagenBijgewerkt > 0 || overgeslagen > 0,
    bericht: delen.join(" · ") + ".",
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
