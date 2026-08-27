"use server";

import { createClient } from "@/lib/supabase/server";

// Publieke actie: spelers zijn niet ingelogd. De database-functie
// academy_quiz_afronden (security definer) scoort server-side — het juiste
// antwoord komt nooit bij de client — en bewaakt dat er per speler maar één
// poging per hoofdstuk bestaat.
export async function academyQuizAfronden(
  hoofdstukId: string,
  spelerId: string,
  antwoorden: Record<string, number>,
): Promise<{ ok: boolean; score?: number; totaal?: number; fout?: string }> {
  if (!/^[0-9a-f-]{36}$/i.test(spelerId) || !/^[0-9a-f-]{36}$/i.test(hoofdstukId)) {
    return { ok: false, fout: "Kies eerst je naam." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("academy_quiz_afronden", {
    p_hoofdstuk: hoofdstukId,
    p_speler: spelerId,
    p_antwoorden: antwoorden,
  } as never);

  if (error) {
    const al = /al gedaan/i.test(error.message);
    return {
      ok: false,
      fout: al
        ? "Deze naam heeft deze quiz al gedaan. Klopt dat niet? Meld het bij de trainer."
        : "Versturen mislukt. Probeer het later opnieuw of meld het bij de trainer.",
    };
  }
  const rij = (data as { score: number; totaal: number }[] | null)?.[0];
  if (!rij) return { ok: false, fout: "Onbekende fout bij het opslaan." };
  return { ok: true, score: rij.score, totaal: rij.totaal };
}
