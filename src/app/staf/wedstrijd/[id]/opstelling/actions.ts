"use server";

import Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getHuidigeGebruiker } from "@/lib/auth";

export interface OpstellingPayload {
  wedstrijd_id: string;
  formatie: string;
  veld: Record<string, string>;
  bank: string[];
}

export async function bewaarOpstelling(payload: OpstellingPayload) {
  const gebruiker = await getHuidigeGebruiker();
  if (gebruiker?.rol !== "staf") return { ok: false, error: "Geen toegang." };

  const supabase = await createClient();

  // 1. De opstelling zelf opslaan.
  const { error } = await supabase
    .from("wedstrijd_opstelling")
    .upsert(payload as never, { onConflict: "wedstrijd_id" });
  if (error) return { ok: false, error: error.message };

  // 2. Basis/wissel/niet-in-selectie automatisch doorzetten naar de
  //    wedstrijdregistratie (alleen het veld startte_als — overige stats
  //    blijven staan dankzij de upsert op de unieke sleutel).
  const { data: spelers } = await supabase.from("spelers").select("id");
  const veldSet = new Set(Object.values(payload.veld).filter(Boolean));
  const bankSet = new Set(payload.bank);
  const rijen = ((spelers ?? []) as { id: string }[]).map((s) => ({
    wedstrijd_id: payload.wedstrijd_id,
    speler_id: s.id,
    startte_als: veldSet.has(s.id)
      ? "basis"
      : bankSet.has(s.id)
        ? "wissel"
        : "niet_in_selectie",
  }));
  if (rijen.length > 0) {
    await supabase
      .from("wedstrijd_registraties")
      .upsert(rijen as never, { onConflict: "wedstrijd_id,speler_id" });
  }

  revalidatePath(`/staf/wedstrijd/${payload.wedstrijd_id}/opstelling`);
  revalidatePath(`/staf/wedstrijd/${payload.wedstrijd_id}/registreren`);
  return { ok: true };
}

// Afmeldstatus van één speler voor deze wedstrijd zetten. Partiële upsert:
// startte_als en stats blijven staan (kolommen hebben defaults).
export async function setWedstrijdAfmelding(
  wedstrijd_id: string,
  speler_id: string,
  afmeld_status: string,
) {
  const gebruiker = await getHuidigeGebruiker();
  if (gebruiker?.rol !== "staf") return { ok: false };

  const supabase = await createClient();
  const { error } = await supabase
    .from("wedstrijd_registraties")
    .upsert(
      { wedstrijd_id, speler_id, afmeld_status } as never,
      { onConflict: "wedstrijd_id,speler_id" },
    );
  revalidatePath(`/staf/wedstrijd/${wedstrijd_id}/opstelling`);
  return { ok: !error };
}

// Teamtaken voor deze wedstrijd bewaren (één taak per regel).
export async function bewaarTeamtaken(formData: FormData) {
  const gebruiker = await getHuidigeGebruiker();
  if (gebruiker?.rol !== "staf") return;
  const wedstrijdId = String(formData.get("wedstrijd_id") ?? "");
  if (!wedstrijdId) return;
  const teamtaken = String(formData.get("teamtaken") ?? "").trim().slice(0, 1000) || null;

  const supabase = await createClient();
  // Upsert raakt alleen de meegegeven kolommen; veld/bank blijven staan.
  await supabase.from("wedstrijd_opstelling").upsert(
    { wedstrijd_id: wedstrijdId, teamtaken } as never,
    { onConflict: "wedstrijd_id" },
  );
  revalidatePath(`/staf/wedstrijd/${wedstrijdId}/opstelling`);
}

// ---- Papieren opstellingsformulier voorlezen met AI -----------------------
// Foto van het met pen ingevulde formulier (4-3-3-veldje + wissels +
// teamtaken) → de AI leest de namen en zet de opstelling in de app. De foto
// wordt niet opgeslagen. Werkt alleen als er nog géén opstelling staat, zodat
// een foto nooit handwerk overschrijft.

const OPSTELLING_FOTO_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["posities", "wissels", "teamtaken"],
  properties: {
    posities: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["positie", "naam"],
        properties: {
          positie: { type: "string", enum: ["K", "LA", "LCV", "RCV", "RA", "LCM", "RCM", "AMC", "LB", "SP", "RB"] },
          naam: { type: "string" },
        },
      },
    },
    wissels: { type: "array", items: { type: "string" } },
    teamtaken: { type: "array", items: { type: "string" } },
  },
} as const;

// Positiecode op papier → slot-key van het 4-3-3-bord.
const CODE_NAAR_SLOT: Record<string, string> = {
  K: "gk", LA: "lv", LCV: "lcv", RCV: "rcv", RA: "rv",
  LCM: "lcm", RCM: "rcm", AMC: "acm", LB: "lb", SP: "sp", RB: "rb",
};

// Geschreven naam → speler. Voornaam is meestal genoeg; bij twijfel (twee
// spelers met dezelfde voornaam) matchen we niet en melden we het.
function vindSpeler(
  geschreven: string,
  spelers: { id: string; naam: string }[],
): string | null {
  const g = geschreven.trim().toLowerCase();
  if (!g) return null;
  const exact = spelers.filter((s) => s.naam.toLowerCase() === g);
  if (exact.length === 1) return exact[0].id;
  const begint = spelers.filter((s) => s.naam.toLowerCase().startsWith(g));
  if (begint.length === 1) return begint[0].id;
  const eersteWoord = g.split(/\s+/)[0];
  const opVoornaam = spelers.filter(
    (s) => s.naam.toLowerCase().split(/\s+/)[0] === eersteWoord,
  );
  if (opVoornaam.length === 1) return opVoornaam[0].id;
  return null;
}

export type OpstellingFotoResultaat = { ok: boolean; bericht: string };

export async function leesOpstellingFoto(formData: FormData): Promise<OpstellingFotoResultaat> {
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
    return { ok: false, bericht: "De AI-koppeling is nog niet ingesteld (ANTHROPIC_API_KEY in Vercel)." };
  }
  const buffer = Buffer.from(await foto.arrayBuffer());
  if (buffer.byteLength > 4_500_000) {
    return { ok: false, bericht: "De foto is te groot (max ± 4,5 MB). Maak de foto opnieuw op een lagere resolutie." };
  }
  const mediaType = (["image/png", "image/webp", "image/gif"].includes(foto.type) ? foto.type : "image/jpeg") as
    "image/png" | "image/webp" | "image/gif" | "image/jpeg";

  const supabase = await createClient();

  // Bescherming: nooit een bestaande opstelling overschrijven met een foto.
  const { data: bestaandRij } = await supabase
    .from("wedstrijd_opstelling").select("*").eq("wedstrijd_id", wedstrijdId).maybeSingle();
  const bestaand = bestaandRij as { veld?: Record<string, string>; bank?: string[]; teamtaken?: string | null } | null;
  if (bestaand && Object.values(bestaand.veld ?? {}).filter(Boolean).length > 0) {
    return {
      ok: false,
      bericht: "Er staat al een opstelling voor deze wedstrijd. Pas hem handmatig aan, of maak eerst alle posities leeg als je de foto wilt gebruiken.",
    };
  }

  const { data: spelersData } = await supabase.from("spelers").select("*");
  const spelers = ((spelersData ?? []) as { id: string; naam: string }[]);
  if (spelers.length === 0) return { ok: false, bericht: "Geen spelers gevonden." };

  let gelezen: { posities: { positie: string; naam: string }[]; wissels: string[]; teamtaken: string[] };
  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 2000,
      thinking: { type: "adaptive" },
      output_config: {
        effort: "low",
        format: { type: "json_schema", schema: OPSTELLING_FOTO_SCHEMA },
      },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: buffer.toString("base64") } },
            {
              type: "text",
              text:
                "Dit is een foto van een met pen ingevuld opstellingsformulier (voetbal, 4-3-3) van Nivo Sparta JO17-2. " +
                "Op het veldje staat bij elk vak een positiecode (K, LA, LCV, RCV, RA, LCM, RCM, AMC, LB, SP, RB) met daaronder een geschreven naam. " +
                "Lees per vak de naam en zet die bij de juiste positiecode. Daaronder staan genummerde regels met wissels en daaronder maximaal drie teamtaken. " +
                "Neem namen letterlijk over zoals ze geschreven zijn (meestal alleen een voornaam) en verzin niets: lege of onleesbare vakken sla je over. " +
                `Ter referentie, de spelersnamen van dit team zijn: ${spelers.map((s) => s.naam).join(", ")}. ` +
                "Gebruik die lijst alleen om onduidelijk handschrift te herkennen; staat er een naam die niet in de lijst voorkomt, neem hem dan toch letterlijk over.",
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
    gelezen = JSON.parse(tekst.text) as typeof gelezen;
  } catch (e) {
    const bericht = e instanceof Error ? e.message : "onbekende fout";
    return { ok: false, bericht: "Voorlezen mislukt: " + bericht };
  }

  // Namen koppelen aan spelers.
  const veld: Record<string, string> = {};
  const nietHerkend: string[] = [];
  const gebruikt = new Set<string>();
  for (const p of gelezen.posities) {
    const slot = CODE_NAAR_SLOT[p.positie];
    if (!slot) continue;
    const spelerId = vindSpeler(p.naam, spelers);
    if (spelerId && !gebruikt.has(spelerId)) {
      veld[slot] = spelerId;
      gebruikt.add(spelerId);
    } else {
      nietHerkend.push(`${p.positie}: ${p.naam}`);
    }
  }
  const bank: string[] = [];
  for (const naam of gelezen.wissels) {
    const spelerId = vindSpeler(naam, spelers);
    if (spelerId && !gebruikt.has(spelerId)) {
      bank.push(spelerId);
      gebruikt.add(spelerId);
    } else if (naam.trim()) {
      nietHerkend.push(`wissel: ${naam}`);
    }
  }

  if (Object.keys(veld).length === 0 && bank.length === 0 && gelezen.teamtaken.length === 0) {
    return { ok: false, bericht: "Geen leesbare namen of taken op de foto gevonden." };
  }

  // Opslaan via dezelfde weg als het bord (zet ook basis/wissel door naar de
  // registraties).
  if (Object.keys(veld).length > 0 || bank.length > 0) {
    const res = await bewaarOpstelling({ wedstrijd_id: wedstrijdId, formatie: "4-3-3", veld, bank });
    if (!res.ok) return { ok: false, bericht: "Opslaan mislukt: " + (res.error ?? "onbekende fout") };
  }

  // Teamtaken (alleen invullen als ze nog leeg zijn).
  const taken = gelezen.teamtaken.map((t) => t.trim()).filter(Boolean).slice(0, 3);
  if (taken.length > 0 && !(bestaand?.teamtaken ?? "").trim()) {
    // Kolom bestaat pas na migratie 0025; een fout hier is niet erg.
    await supabase.from("wedstrijd_opstelling").upsert(
      { wedstrijd_id: wedstrijdId, teamtaken: taken.join("\n") } as never,
      { onConflict: "wedstrijd_id" },
    );
  }

  revalidatePath(`/staf/wedstrijd/${wedstrijdId}/opstelling`);
  const delen = [`${Object.keys(veld).length} veldspelers en ${bank.length} wissels ingevuld`];
  if (taken.length > 0) delen.push(`${taken.length} teamtaken overgenomen`);
  if (nietHerkend.length > 0) delen.push(`niet herkend: ${nietHerkend.join(", ")}`);
  return { ok: true, bericht: delen.join(" · ") + ". Controleer het bord en sla op waar nodig." };
}

// Gastspeler toevoegen (bijv. een JO16-speler die meedoet). Komt direct
// beschikbaar in de opstelling-kiezer; blijft buiten trainingen/vragenlijst.
export async function voegGastToe(formData: FormData) {
  const gebruiker = await getHuidigeGebruiker();
  if (gebruiker?.rol !== "staf") return;

  const wedstrijdId = String(formData.get("wedstrijd_id") ?? "");
  const naam = String(formData.get("naam") ?? "").trim().slice(0, 80);
  const rugRaw = String(formData.get("rugnummer") ?? "").trim();
  const rugnummer = rugRaw && /^\d{1,3}$/.test(rugRaw) ? Number(rugRaw) : null;
  if (!naam) return;

  const supabase = await createClient();
  await supabase.from("spelers").insert({ naam, rugnummer, gast: true } as never);
  if (wedstrijdId) revalidatePath(`/staf/wedstrijd/${wedstrijdId}/opstelling`);
}
