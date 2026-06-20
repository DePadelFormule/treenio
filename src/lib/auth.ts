import { createClient } from "@/lib/supabase/server";
import type { Speler, Staf } from "@/lib/types/database";

export type Rolle = "staf" | "speler" | "onbekend";

export interface HuidigeGebruiker {
  userId: string;
  email: string | null;
  rol: Rolle;
  staf: Staf | null;
  speler: Speler | null;
}

// Bepaalt server-side wie er is ingelogd en welke rol die heeft.
// Rolbepaling gebeurt op basis van koppeling in de staf- / spelers-tabel,
// NIET op een claim die de client kan zetten.
export async function getHuidigeGebruiker(): Promise<HuidigeGebruiker | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Eerst staf checken (staf wint als iemand per ongeluk in beide tabellen staat).
  const { data: staf } = await supabase
    .from("staf")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (staf) {
    return {
      userId: user.id,
      email: user.email ?? null,
      rol: "staf",
      staf: staf as Staf,
      speler: null,
    };
  }

  const { data: speler } = await supabase
    .from("spelers")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (speler) {
    return {
      userId: user.id,
      email: user.email ?? null,
      rol: "speler",
      staf: null,
      speler: speler as Speler,
    };
  }

  return {
    userId: user.id,
    email: user.email ?? null,
    rol: "onbekend",
    staf: null,
    speler: null,
  };
}
