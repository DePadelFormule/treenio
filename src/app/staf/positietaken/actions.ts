"use server";

import { createClient } from "@/lib/supabase/server";
import { getHuidigeGebruiker } from "@/lib/auth";

export interface OpslaanResultaat {
  ok: boolean;
  fout?: string;
}

// Taken voor één positie × situatie bewaren (upsert op de unieke combinatie).
export async function bewaarPositieTaken(
  positieCode: string,
  situatie: string,
  taken: string,
): Promise<OpslaanResultaat> {
  const gebruiker = await getHuidigeGebruiker();
  if (gebruiker?.rol !== "staf") return { ok: false, fout: "Geen toegang." };
  if (!positieCode || !situatie) return { ok: false, fout: "Positie en situatie zijn verplicht." };

  const supabase = await createClient();
  const waarde = taken.trim().slice(0, 2000) || null;
  const { error } = await supabase
    .from("positie_taken")
    .upsert(
      { positie_code: positieCode, situatie, taken: waarde } as never,
      { onConflict: "positie_code,situatie" },
    );
  if (error) return { ok: false, fout: error.message };
  return { ok: true };
}
