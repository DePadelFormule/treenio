"use server";

import { createClient } from "@/lib/supabase/server";
import { VRAGENLIJST } from "@/lib/vragenlijst";

// Publieke actie: spelers zijn niet ingelogd. De database-functie
// vragenlijst_opslaan (security definer) bewaakt dat er per speler maar één
// inzending kan bestaan; hier valideren we de invoer.
export async function verstuurVragenlijst(
  spelerId: string,
  antwoorden: Record<string, string>,
): Promise<{ ok: boolean; fout?: string }> {
  if (!/^[0-9a-f-]{36}$/i.test(spelerId)) return { ok: false, fout: "Kies eerst je naam." };

  const schoon: Record<string, string> = {};
  for (const vraag of VRAGENLIJST) {
    const waarde = String(antwoorden[vraag.id] ?? "").trim().slice(0, 2000);
    if (!waarde && !vraag.optioneel) {
      return { ok: false, fout: `Vul nog in: "${vraag.tekst}"` };
    }
    if (vraag.type === "keuze" && waarde && !vraag.opties?.includes(waarde)) {
      return { ok: false, fout: "Ongeldige keuze bij een van de vragen." };
    }
    if (waarde) schoon[vraag.id] = waarde;
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("vragenlijst_opslaan", {
    p_speler: spelerId,
    p_antwoorden: schoon,
  } as never);

  if (error) {
    const al = /al ingevuld/i.test(error.message);
    return {
      ok: false,
      fout: al
        ? "Deze naam heeft de vragenlijst al ingevuld. Klopt dat niet? Meld het bij de trainer."
        : "Versturen mislukt. Probeer het later opnieuw of meld het bij de trainer.",
    };
  }
  return { ok: true };
}
