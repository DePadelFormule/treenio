"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getHuidigeGebruiker } from "@/lib/auth";
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
  const { data: bestaand } = await supabase.from("wedstrijden").select("*");
  const bestaandLijst = (bestaand ?? []) as { id: string; datum: string; tegenstander: string; tijd?: string | null }[];
  const bestaandMap = new Map(
    bestaandLijst.map((b) => [`${b.datum}|${b.tegenstander.toLowerCase()}`, b]),
  );

  const nieuw = resultaat.wedstrijden.filter(
    (w) => !bestaandMap.has(`${w.datum}|${w.tegenstander.toLowerCase()}`),
  );
  const overgeslagen = resultaat.wedstrijden.length - nieuw.length;

  if (nieuw.length > 0) {
    const { error } = await supabase
      .from("wedstrijden")
      .insert(nieuw.map((w) => ({ datum: w.datum, tegenstander: w.tegenstander, tijd: w.tijd })) as never);
    if (error) {
      // Vóór migratie 0023 bestaat de tijd-kolom nog niet; dan zonder tijd.
      const { error: error2 } = await supabase
        .from("wedstrijden")
        .insert(nieuw.map((w) => ({ datum: w.datum, tegenstander: w.tegenstander })) as never);
      if (error2) return { ok: false, bericht: `Opslaan mislukt: ${error2.message}` };
    }
  }

  // Bestaande wedstrijden zonder tijd: de geplakte tijd alsnog invullen. Zo kun
  // je het programma opnieuw plakken om alleen de aanvangstijden aan te vullen.
  let tijdenAangevuld = 0;
  for (const w of resultaat.wedstrijden) {
    const b = bestaandMap.get(`${w.datum}|${w.tegenstander.toLowerCase()}`);
    if (b && w.tijd && !b.tijd) {
      const { error } = await supabase.from("wedstrijden").update({ tijd: w.tijd } as never).eq("id", b.id);
      if (!error) tijdenAangevuld++;
    }
  }

  revalidatePath("/staf/wedstrijden");

  const delen = [`${nieuw.length} ${nieuw.length === 1 ? "wedstrijd" : "wedstrijden"} toegevoegd`];
  if (overgeslagen > 0) delen.push(`${overgeslagen} stond${overgeslagen === 1 ? "" : "en"} er al in`);
  if (tijdenAangevuld > 0) delen.push(`${tijdenAangevuld} aanvangstijd${tijdenAangevuld === 1 ? "" : "en"} aangevuld`);
  if (resultaat.zonderDatum > 0) delen.push(`${resultaat.zonderDatum} regel(s) zonder datum overgeslagen`);
  return { ok: nieuw.length > 0 || overgeslagen > 0, bericht: delen.join(" · ") + "." };
}

const WEDSTRIJD_TYPES = ["competitie", "beker", "vriendschappelijk"];

export async function nieuweWedstrijd(formData: FormData) {
  const gebruiker = await getHuidigeGebruiker();
  if (gebruiker?.rol !== "staf") return;

  const datum = String(formData.get("datum") ?? "").trim();
  const tegenstander = String(formData.get("tegenstander") ?? "").trim();
  const uitslag = String(formData.get("uitslag") ?? "").trim() || null;
  const type = String(formData.get("type") ?? "competitie");
  const tijdRaw = String(formData.get("tijd") ?? "").trim();
  const tijd = /^([01]?\d|2[0-3]):[0-5]\d$/.test(tijdRaw) ? tijdRaw.padStart(5, "0") : null;
  if (!datum || !tegenstander || !WEDSTRIJD_TYPES.includes(type)) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("wedstrijden")
    .insert({ datum, tegenstander, uitslag, type, tijd } as never);
  if (error) {
    // Vóór migratie 0022/0023 bestaan de type/tijd-kolommen nog niet.
    await supabase.from("wedstrijden").insert({ datum, tegenstander, uitslag } as never);
  }
  revalidatePath("/staf/wedstrijden");
}

// Aanvangstijd van een bestaande wedstrijd wijzigen (tijdveldje in de lijst).
export async function setWedstrijdTijd(id: string, tijd: string) {
  const gebruiker = await getHuidigeGebruiker();
  if (gebruiker?.rol !== "staf") return;
  const schoon = tijd.trim();
  const waarde = /^([01]?\d|2[0-3]):[0-5]\d$/.test(schoon) ? schoon.padStart(5, "0") : null;
  if (!id || (schoon && !waarde)) return;

  const supabase = await createClient();
  await supabase.from("wedstrijden").update({ tijd: waarde } as never).eq("id", id);
  revalidatePath("/staf/wedstrijden");
}

// Type van een bestaande wedstrijd wijzigen (chips op de wedstrijdenlijst).
export async function setWedstrijdType(id: string, type: string) {
  const gebruiker = await getHuidigeGebruiker();
  if (gebruiker?.rol !== "staf") return;
  if (!id || !WEDSTRIJD_TYPES.includes(type)) return;

  const supabase = await createClient();
  await supabase.from("wedstrijden").update({ type } as never).eq("id", id);
  revalidatePath("/staf/wedstrijden");
  revalidatePath("/staf/team");
  revalidatePath("/staf/spelers");
}
