import { createClient } from "@/lib/supabase/server";
import type { Staf } from "@/lib/types/database";

export type Rolle = "staf" | "onbekend";

export interface HuidigeGebruiker {
  userId: string;
  email: string | null;
  rol: Rolle;
  staf: Staf | null;
}

// Bepaalt server-side wie er is ingelogd. Treenio is volledig staf-only:
// alleen trainers hebben een account. Rolbepaling op basis van de staf-tabel,
// niet op een claim die de client kan zetten.
export async function getHuidigeGebruiker(): Promise<HuidigeGebruiker | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

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
    };
  }

  return {
    userId: user.id,
    email: user.email ?? null,
    rol: "onbekend",
    staf: null,
  };
}
