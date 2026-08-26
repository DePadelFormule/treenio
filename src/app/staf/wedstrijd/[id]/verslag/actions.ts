"use server";

import Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getHuidigeGebruiker } from "@/lib/auth";

function veld(formData: FormData, naam: string): string | null {
  const v = String(formData.get(naam) ?? "").trim();
  return v ? v.slice(0, 2000) : null;
}

// Teamverslag (1 per wedstrijd): wat ging goed, wat kan beter, wat nemen we
// mee naar de training.
export async function bewaarWedstrijdVerslag(formData: FormData) {
  const gebruiker = await getHuidigeGebruiker();
  if (gebruiker?.rol !== "staf") return;
  const wedstrijdId = String(formData.get("wedstrijd_id") ?? "");
  if (!wedstrijdId) return;

  const supabase = await createClient();
  await supabase.from("wedstrijd_verslag").upsert(
    {
      wedstrijd_id: wedstrijdId,
      ging_goed: veld(formData, "ging_goed"),
      kan_beter: veld(formData, "kan_beter"),
      voor_training: veld(formData, "voor_training"),
    } as never,
    { onConflict: "wedstrijd_id" },
  );
  revalidatePath(`/staf/wedstrijd/${wedstrijdId}/verslag`);
}

// ---- Foto voorlezen met AI ------------------------------------------------
// Leest het handschrift op een foto van het papieren formulier en vult de lege
// velden van het teamverslag en de scouting. De foto wordt NIET opgeslagen;
// hij gaat één keer langs de AI en wordt daarna weggegooid. Al ingevulde
// (getypte) velden blijven altijd staan.

const FOTO_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "ging_goed", "kan_beter", "voor_training",
    "systeem_tegenstander", "drukzetten", "omschakeling",
    "standaardsituaties", "uitblinkers", "zwakke_schakel", "eigen_opmerking",
  ],
  properties: {
    ging_goed: { type: ["string", "null"] },
    kan_beter: { type: ["string", "null"] },
    voor_training: { type: ["string", "null"] },
    systeem_tegenstander: { type: ["string", "null"] },
    drukzetten: { type: ["string", "null"], enum: ["hoog", "inzakken", "wisselend", null] },
    omschakeling: { type: ["string", "null"] },
    standaardsituaties: { type: ["string", "null"] },
    uitblinkers: { type: ["string", "null"] },
    zwakke_schakel: { type: ["string", "null"] },
    eigen_opmerking: { type: ["string", "null"] },
  },
} as const;

type FotoVelden = {
  ging_goed: string | null;
  kan_beter: string | null;
  voor_training: string | null;
  systeem_tegenstander: string | null;
  drukzetten: "hoog" | "inzakken" | "wisselend" | null;
  omschakeling: string | null;
  standaardsituaties: string | null;
  uitblinkers: string | null;
  zwakke_schakel: string | null;
  eigen_opmerking: string | null;
};

export type FotoLeesResultaat = { ok: boolean; bericht: string };

export async function leesVerslagFoto(formData: FormData): Promise<FotoLeesResultaat> {
  const gebruiker = await getHuidigeGebruiker();
  if (gebruiker?.rol !== "staf") return { ok: false, bericht: "Geen toegang." };
  const wedstrijdId = String(formData.get("wedstrijd_id") ?? "");
  if (!wedstrijdId) return { ok: false, bericht: "Geen wedstrijd." };
  const foto = formData.get("foto");
  if (!(foto instanceof File) || foto.size === 0) {
    return { ok: false, bericht: "Kies of maak eerst een foto van het formulier." };
  }
  if (!foto.type.startsWith("image/")) {
    return { ok: false, bericht: "Alleen foto's (JPG/PNG) worden ondersteund." };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      bericht: "De AI-koppeling is nog niet ingesteld (ANTHROPIC_API_KEY in Vercel).",
    };
  }

  const buffer = Buffer.from(await foto.arrayBuffer());
  if (buffer.byteLength > 4_500_000) {
    return { ok: false, bericht: "De foto is te groot (max ± 4,5 MB). Maak de foto opnieuw op een lagere resolutie." };
  }
  const mediaType = (["image/png", "image/webp", "image/gif"].includes(foto.type) ? foto.type : "image/jpeg") as
    "image/png" | "image/webp" | "image/gif" | "image/jpeg";

  const supabase = await createClient();
  const { data: verslagRij } = await supabase
    .from("wedstrijd_verslag").select("*").eq("wedstrijd_id", wedstrijdId).maybeSingle();
  const verslag = verslagRij as
    | { ging_goed: string | null; kan_beter: string | null; voor_training: string | null }
    | null;

  const client = new Anthropic({ apiKey });
  let velden: FotoVelden;
  try {
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 3000,
      thinking: { type: "adaptive" },
      output_config: {
        effort: "low",
        format: { type: "json_schema", schema: FOTO_SCHEMA },
      },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: buffer.toString("base64") },
            },
            {
              type: "text",
              text:
                "Dit is een foto van een met pen ingevuld wedstrijdformulier van een Nederlands jeugdvoetbalteam. " +
                "Lees het handschrift en zet de tekst per vak in het JSON-schema. " +
                "De vakken heten op papier: 'Wat ging goed', 'Wat kan beter', 'Meenemen naar de training', " +
                "'Systeem', 'Druk zetten', 'Omschakeling & counter', 'Vaste spelmomenten', " +
                "'Opvallend sterk', 'Opvallend zwak' en 'Overige opmerkingen'. " +
                "Neem de tekst letterlijk over (typ afkortingen niet uit) en verzin niets: een leeg of onleesbaar vak wordt null. " +
                "Voor drukzetten alleen 'hoog', 'inzakken' of 'wisselend' als dat er duidelijk staat, anders null.",
            },
          ],
        },
      ],
    });

    if (response.stop_reason === "refusal" || response.stop_reason === "max_tokens") {
      return { ok: false, bericht: "De AI kon de foto niet verwerken. Probeer een scherpere foto." };
    }
    const tekst = response.content.find((b) => b.type === "text");
    if (!tekst || tekst.type !== "text") return { ok: false, bericht: "Geen bruikbaar antwoord van de AI." };
    velden = JSON.parse(tekst.text) as FotoVelden;
  } catch (e) {
    const bericht = e instanceof Error ? e.message : "onbekende fout";
    return { ok: false, bericht: "Voorlezen mislukt: " + bericht };
  }

  // Alleen lege velden invullen; getypte tekst nooit overschrijven.
  const { data: scoutingRij } = await supabase
    .from("wedstrijd_scouting").select("*").eq("wedstrijd_id", wedstrijdId).maybeSingle();
  const scouting = scoutingRij as Record<string, string | null> | null;

  const verslagUpdate: Record<string, string> = {};
  for (const veldNaam of ["ging_goed", "kan_beter", "voor_training"] as const) {
    const nieuw = velden[veldNaam]?.trim();
    if (nieuw && !(verslag?.[veldNaam] ?? "").trim()) verslagUpdate[veldNaam] = nieuw.slice(0, 2000);
  }
  const scoutingUpdate: Record<string, string> = {};
  for (const veldNaam of [
    "systeem_tegenstander", "drukzetten", "omschakeling",
    "standaardsituaties", "uitblinkers", "zwakke_schakel", "eigen_opmerking",
  ] as const) {
    const nieuw = velden[veldNaam]?.trim();
    if (nieuw && !(scouting?.[veldNaam] ?? "").trim()) scoutingUpdate[veldNaam] = nieuw.slice(0, 2000);
  }

  const aantal = Object.keys(verslagUpdate).length + Object.keys(scoutingUpdate).length;
  if (aantal === 0) {
    return { ok: true, bericht: "Niets ingevuld: alle velden waren al gevuld of de foto bevatte geen leesbare tekst." };
  }

  if (Object.keys(verslagUpdate).length > 0) {
    await supabase.from("wedstrijd_verslag").upsert(
      { wedstrijd_id: wedstrijdId, ...verslagUpdate } as never,
      { onConflict: "wedstrijd_id" },
    );
  }
  if (Object.keys(scoutingUpdate).length > 0) {
    const { error } = await supabase.from("wedstrijd_scouting").upsert(
      { wedstrijd_id: wedstrijdId, ...scoutingUpdate } as never,
      { onConflict: "wedstrijd_id" },
    );
    if (error) {
      // Vóór migratie 0024: nogmaals zonder de nieuwe kolommen.
      delete scoutingUpdate.omschakeling;
      delete scoutingUpdate.standaardsituaties;
      if (Object.keys(scoutingUpdate).length > 0) {
        await supabase.from("wedstrijd_scouting").upsert(
          { wedstrijd_id: wedstrijdId, ...scoutingUpdate } as never,
          { onConflict: "wedstrijd_id" },
        );
      }
    }
  }

  revalidatePath(`/staf/wedstrijd/${wedstrijdId}/verslag`);
  return {
    ok: true,
    bericht: `${aantal} veld${aantal === 1 ? "" : "en"} ingevuld vanaf de foto. Controleer de tekst en sla op waar nodig.`,
  };
}

// Tegenstander-scouting (1 per wedstrijd).
export async function bewaarScouting(formData: FormData) {
  const gebruiker = await getHuidigeGebruiker();
  if (gebruiker?.rol !== "staf") return;
  const wedstrijdId = String(formData.get("wedstrijd_id") ?? "");
  if (!wedstrijdId) return;

  const drukRaw = String(formData.get("drukzetten") ?? "");
  const drukzetten = ["hoog", "inzakken", "wisselend"].includes(drukRaw) ? drukRaw : null;
  const basis = {
    wedstrijd_id: wedstrijdId,
    systeem_tegenstander: veld(formData, "systeem_tegenstander"),
    drukzetten,
    zwakke_schakel: veld(formData, "zwakke_schakel"),
    uitblinkers: veld(formData, "uitblinkers"),
    eigen_opmerking: veld(formData, "eigen_opmerking"),
  };

  const supabase = await createClient();
  const { error } = await supabase.from("wedstrijd_scouting").upsert(
    {
      ...basis,
      omschakeling: veld(formData, "omschakeling"),
      standaardsituaties: veld(formData, "standaardsituaties"),
    } as never,
    { onConflict: "wedstrijd_id" },
  );
  if (error) {
    // Vóór migratie 0024 bestaan omschakeling/standaardsituaties nog niet.
    await supabase.from("wedstrijd_scouting").upsert(basis as never, { onConflict: "wedstrijd_id" });
  }
  revalidatePath(`/staf/wedstrijd/${wedstrijdId}/verslag`);
}
