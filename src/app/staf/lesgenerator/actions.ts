"use server";

import Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";
import { getHuidigeGebruiker } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LES_INSTRUCTIE } from "@/lib/lesgenerator/instructie";
import { LES_JSON_SCHEMA } from "@/lib/lesgenerator/schema";
import type { Les, Sport } from "@/lib/lesgenerator/schema";

export interface LesInvoer {
  sport: Sport;
  onderwerp: string;
  duur_minuten: number;
  aantal_spelers: number;
  fase: number; // 1-4
  niveau: string;
  wensen: string; // optioneel; extra aandachtspunten van de trainer
}

export type LesResultaat =
  | { ok: true; les: Les }
  | { ok: false; fout: string };

export async function genereerLes(invoer: LesInvoer): Promise<LesResultaat> {
  const gebruiker = await getHuidigeGebruiker();
  // Alleen de hoofdtrainer: elke aanroep kost API-tegoed.
  if (gebruiker?.rol !== "staf" || !gebruiker.staf?.mag_conclusie) {
    return { ok: false, fout: "Geen toegang." };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      fout:
        "De AI-koppeling is nog niet ingesteld. Zet ANTHROPIC_API_KEY in de omgeving (Vercel → Settings → Environment Variables).",
    };
  }

  const client = new Anthropic({ apiKey });

  const opdracht = [
    `Maak een complete ${invoer.sport}-les.`,
    `Onderwerp: ${invoer.onderwerp}.`,
    `Totale lesduur: ${invoer.duur_minuten} minuten (de som van de bloktijden moet hier exact op uitkomen).`,
    `Aantal spelers: ${invoer.aantal_spelers}.`,
    `Fase: ${invoer.fase} (1 = basistechniek, 2 = plaatsing, 3 = controle, 4 = effect en varianten).`,
    invoer.niveau ? `Niveau/leeftijd: ${invoer.niveau}.` : "",
    invoer.wensen ? `Extra wensen van de trainer: ${invoer.wensen}.` : "",
    `Gebruik alleen het ${invoer.sport}-blok uit de instructie; negeer het andere sport-blok.`,
    `Vul elk veld van het schema. 'organisatie' bij oefen-, rally- en wedstrijdblokken begint met "Tekening:". 'coachpunten' maximaal vier per blok, op volgorde van belang. Leeskaart in de je-vorm.`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 6000,
      thinking: { type: "adaptive" },
      output_config: {
        effort: "low",
        format: { type: "json_schema", schema: LES_JSON_SCHEMA },
      },
      system: [
        {
          type: "text",
          text: LES_INSTRUCTIE,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: opdracht }],
    });

    if (response.stop_reason === "refusal") {
      return { ok: false, fout: "De AI weigerde dit verzoek. Pas het onderwerp aan." };
    }
    if (response.stop_reason === "max_tokens") {
      return { ok: false, fout: "Het antwoord werd te lang. Probeer een kortere lesduur." };
    }

    const tekst = response.content.find((b) => b.type === "text");
    if (!tekst || tekst.type !== "text") {
      return { ok: false, fout: "Geen bruikbaar antwoord van de AI." };
    }

    const les = JSON.parse(tekst.text) as Les;
    return { ok: true, les };
  } catch (e) {
    const bericht = e instanceof Error ? e.message : "onbekende fout";
    return { ok: false, fout: "Genereren mislukt: " + bericht };
  }
}

// Een gegenereerde les bewaren in het archief, optioneel gekoppeld aan een
// trainingsdatum. Zo blijft een goede les herbruikbaar (herhaling!).
export async function bewaarLes(
  les: Les,
  datum: string | null,
): Promise<{ ok: boolean; fout?: string }> {
  const gebruiker = await getHuidigeGebruiker();
  if (gebruiker?.rol !== "staf") return { ok: false, fout: "Geen toegang." };

  const supabase = await createClient();
  const { error } = await supabase.from("lessen").insert({
    titel: les.titel,
    sport: les.sport,
    onderwerp: les.onderwerp,
    datum: datum || null,
    les,
  } as never);
  if (error) {
    return {
      ok: false,
      fout: "Opslaan mislukt. Is de lessen-tabel al aangemaakt in Supabase (migratie 0016)?",
    };
  }
  revalidatePath("/staf/lessen");
  return { ok: true };
}

// ---- Papieren lesvoorbereiding voorlezen met AI ---------------------------
// Foto van het met pen ingevulde lesformulier → de AI zet de les in dezelfde
// structuur als de generator en bewaart hem direct in het archief. De foto
// wordt niet opgeslagen.

const LES_FOTO_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    datum: { type: ["string", "null"] },
    les: LES_JSON_SCHEMA,
  },
  required: ["datum", "les"],
} as const;

export type LesFotoResultaat = { ok: boolean; bericht: string };

export async function leesLesFoto(formData: FormData): Promise<LesFotoResultaat> {
  const gebruiker = await getHuidigeGebruiker();
  if (gebruiker?.rol !== "staf" || !gebruiker.staf?.mag_conclusie) {
    return { ok: false, bericht: "Geen toegang." };
  }
  const foto = formData.get("foto");
  if (!(foto instanceof File) || foto.size === 0) {
    return { ok: false, bericht: "Kies of maak eerst een foto van het formulier." };
  }
  if (!foto.type.startsWith("image/")) {
    return { ok: false, bericht: "Alleen foto's (JPG/PNG) worden ondersteund." };
  }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { ok: false, bericht: "De AI-koppeling is nog niet ingesteld (ANTHROPIC_API_KEY in Vercel)." };
  }
  const buffer = Buffer.from(await foto.arrayBuffer());
  if (buffer.byteLength > 4_500_000) {
    return { ok: false, bericht: "De foto is te groot (max ± 4,5 MB). Maak de foto opnieuw op een lagere resolutie." };
  }
  const mediaType = (["image/png", "image/webp", "image/gif"].includes(foto.type) ? foto.type : "image/jpeg") as
    "image/png" | "image/webp" | "image/gif" | "image/jpeg";

  let datum: string | null;
  let les: Les;
  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 4000,
      thinking: { type: "adaptive" },
      output_config: {
        effort: "low",
        format: { type: "json_schema", schema: LES_FOTO_SCHEMA },
      },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: buffer.toString("base64") } },
            {
              type: "text",
              text:
                "Dit is een foto van een met pen ingevuld voetbal-lesvoorbereidingsformulier (JO17, half veld). " +
                "Bovenaan staan datum, thema, aantal spelers en duur; daaronder vier blokken " +
                "(Warming-up, Oefenvorm 1, Oefenvorm 2, Partijvorm / afsluiting) met per blok minuten, doel, organisatie & uitleg, coachpunten en materiaal. " +
                "Neem de tekst letterlijk over en verzin niets. Vul zo in: datum als YYYY-MM-DD (anders null); " +
                "les.titel en les.onderwerp = het thema; les.sport = 'voetbal'; les.fase = 0; les.niveau = 'JO17'; " +
                "les.totale_duur_minuten en les.aantal_spelers van het formulier (onleesbaar = 0); " +
                "les.materiaal = alle genoemde materialen samengevoegd; " +
                "les.blokken = alleen de blokken waar iets bij geschreven is (type: 'warming-up', 'oefenvorm' of 'wedstrijdvorm'; " +
                "coachpunten als losse punten; progressie_makkelijker en progressie_moeilijker leeg laten als ze niet op papier staan); " +
                "les.leeskaart: lege lijsten tenzij er duidelijk focuspunten geschreven zijn. " +
                "Een leeg of onleesbaar veld wordt een lege tekst of 0.",
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
    const uit = JSON.parse(tekst.text) as { datum: string | null; les: Les };
    datum = uit.datum && /^\d{4}-\d{2}-\d{2}$/.test(uit.datum) ? uit.datum : null;
    les = uit.les;
  } catch (e) {
    const bericht = e instanceof Error ? e.message : "onbekende fout";
    return { ok: false, bericht: "Voorlezen mislukt: " + bericht };
  }

  if (!les.titel.trim() && les.blokken.length === 0) {
    return { ok: false, bericht: "Geen leesbare les op de foto gevonden." };
  }
  if (!les.titel.trim()) les.titel = "Lesvoorbereiding (papier)";

  const supabase = await createClient();
  const { error } = await supabase.from("lessen").insert({
    titel: les.titel,
    sport: les.sport,
    onderwerp: les.onderwerp || les.titel,
    datum,
    les,
  } as never);
  if (error) return { ok: false, bericht: "Opslaan in het archief mislukt: " + error.message };

  revalidatePath("/staf/lessen");
  return {
    ok: true,
    bericht: `Les "${les.titel}" met ${les.blokken.length} blok${les.blokken.length === 1 ? "" : "ken"} in het archief gezet. Controleer hem daar even.`,
  };
}

export async function verwijderLes(formData: FormData) {
  const gebruiker = await getHuidigeGebruiker();
  if (gebruiker?.rol !== "staf") return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("lessen").delete().eq("id", id);
  revalidatePath("/staf/lessen");
}
