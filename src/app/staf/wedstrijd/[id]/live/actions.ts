"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getHuidigeGebruiker } from "@/lib/auth";

type SupaClient = Awaited<ReturnType<typeof createClient>>;

interface EventRij { speler_id: string | null; type: string; minuut: number; }

// Leidt speelminuten, goals, assists en kaarten af uit de opstelling (basis) +
// events, en schrijft ze naar wedstrijd_registraties (partiële upsert, zodat
// handmatig ingevoerde stats zoals duels/balverlies blijven staan).
async function herbereken(supabase: SupaClient, wedstrijdId: string) {
  const [{ data: opstelling }, { data: events }] = await Promise.all([
    supabase.from("wedstrijd_opstelling").select("veld").eq("wedstrijd_id", wedstrijdId).maybeSingle(),
    supabase.from("wedstrijd_events").select("speler_id, type, minuut").eq("wedstrijd_id", wedstrijdId),
  ]);

  const veld = ((opstelling as { veld?: Record<string, string> } | null)?.veld) ?? {};
  const basis = new Set(Object.values(veld).filter(Boolean));
  const ev = (events ?? []) as EventRij[];

  const einde = ev.filter((e) => e.type === "einde").map((e) => e.minuut);
  // JO17 speelt 2×40 = 80 minuten; zonder gelogd "einde" rekenen we daarmee.
  const matchEnd = einde.length ? Math.max(...einde) : 80;

  const ids = new Set<string>(basis);
  for (const e of ev) if (e.speler_id) ids.add(e.speler_id);

  const rijen = [...ids].map((id) => {
    const eigen = ev.filter((e) => e.speler_id === id);
    const inMin = eigen.filter((e) => e.type === "wissel_in").map((e) => e.minuut);
    const uitMin = eigen.filter((e) => e.type === "wissel_uit" || e.type === "rood").map((e) => e.minuut);

    const entry = basis.has(id) ? 0 : (inMin.length ? Math.min(...inMin) : null);
    const exit = uitMin.length ? Math.min(...uitMin) : (entry !== null ? matchEnd : null);
    const minuten = entry !== null && exit !== null ? Math.max(0, exit - entry) : 0;

    return {
      wedstrijd_id: wedstrijdId,
      speler_id: id,
      goals: eigen.filter((e) => e.type === "goal").length,
      assists: eigen.filter((e) => e.type === "assist").length,
      gele_kaarten: Math.min(2, eigen.filter((e) => e.type === "geel").length),
      rode_kaart: eigen.some((e) => e.type === "rood"),
      speelminuten: minuten,
      ingevallen: inMin.length > 0,
      gewisseld_uit: eigen.some((e) => e.type === "wissel_uit"),
    };
  });

  if (rijen.length > 0) {
    await supabase.from("wedstrijd_registraties").upsert(rijen as never, { onConflict: "wedstrijd_id,speler_id" });
  }

  // Is de wedstrijd afgesloten ("einde" gelogd), schrijf dan de eindstand als
  // uitslag (wij-tegen) in de wedstrijdenlijst. Zo vult de uitslag van eigen
  // wedstrijden zichzelf in via de live-registratie.
  const heeftEinde = ev.some((e) => e.type === "einde");
  if (heeftEinde) {
    const wij = ev.filter((e) => e.type === "goal").length;
    const tegen = ev.filter((e) => e.type === "tegengoal").length;
    await supabase
      .from("wedstrijden")
      .update({ uitslag: `${wij}-${tegen}` } as never)
      .eq("id", wedstrijdId);
  }
}

export interface EventPayload {
  wedstrijd_id: string;
  speler_id: string | null;
  type: string;
  minuut: number;
}

export async function logEvent(p: EventPayload): Promise<{ ok: boolean; id?: string }> {
  const gebruiker = await getHuidigeGebruiker();
  if (gebruiker?.rol !== "staf") return { ok: false };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("wedstrijd_events")
    .insert({ wedstrijd_id: p.wedstrijd_id, speler_id: p.speler_id, type: p.type, minuut: p.minuut } as never)
    .select("id")
    .single();
  if (error || !data) return { ok: false };

  await herbereken(supabase, p.wedstrijd_id);
  revalidatePath(`/staf/wedstrijd/${p.wedstrijd_id}/live`);
  revalidatePath("/staf/team");
  revalidatePath("/staf/wedstrijden");
  return { ok: true, id: (data as { id: string }).id };
}

export async function verwijderEvent(id: string, wedstrijd_id: string): Promise<{ ok: boolean }> {
  const gebruiker = await getHuidigeGebruiker();
  if (gebruiker?.rol !== "staf") return { ok: false };

  const supabase = await createClient();
  const { error } = await supabase.from("wedstrijd_events").delete().eq("id", id);
  if (error) return { ok: false };

  await herbereken(supabase, wedstrijd_id);
  revalidatePath(`/staf/wedstrijd/${wedstrijd_id}/live`);
  revalidatePath("/staf/team");
  revalidatePath("/staf/wedstrijden");
  return { ok: true };
}
