"use server";

import Anthropic from "@anthropic-ai/sdk";
import { getHuidigeGebruiker } from "@/lib/auth";
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
  if (gebruiker?.rol !== "staf") return { ok: false, fout: "Geen toegang." };

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
