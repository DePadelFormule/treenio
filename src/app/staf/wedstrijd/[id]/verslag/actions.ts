"use server";

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

// Foto van het met pen ingevulde papieren formulier. Eén per wedstrijd; een
// nieuwe upload vervangt de oude.
export async function uploadVerslagFoto(formData: FormData) {
  const gebruiker = await getHuidigeGebruiker();
  if (gebruiker?.rol !== "staf") return;
  const wedstrijdId = String(formData.get("wedstrijd_id") ?? "");
  const foto = formData.get("foto");
  if (!wedstrijdId || !(foto instanceof File) || foto.size === 0) return;
  if (!foto.type.startsWith("image/") || foto.size > 10 * 1024 * 1024) return;

  const ext = foto.type === "image/png" ? "png" : foto.type === "image/webp" ? "webp" : "jpg";
  const pad = `${wedstrijdId}/verslag-${Date.now()}.${ext}`;

  const supabase = await createClient();
  const { data: huidige } = await supabase
    .from("wedstrijd_verslag").select("foto_pad").eq("wedstrijd_id", wedstrijdId).maybeSingle();
  const oudPad = (huidige as { foto_pad?: string | null } | null)?.foto_pad ?? null;

  const { error } = await supabase.storage.from("verslagfotos").upload(pad, foto, { contentType: foto.type });
  if (error) return;
  const { error: dbError } = await supabase.from("wedstrijd_verslag").upsert(
    { wedstrijd_id: wedstrijdId, foto_pad: pad } as never,
    { onConflict: "wedstrijd_id" },
  );
  if (dbError) {
    await supabase.storage.from("verslagfotos").remove([pad]);
    return;
  }
  if (oudPad && oudPad !== pad) await supabase.storage.from("verslagfotos").remove([oudPad]);
  revalidatePath(`/staf/wedstrijd/${wedstrijdId}/verslag`);
}

export async function verwijderVerslagFoto(formData: FormData) {
  const gebruiker = await getHuidigeGebruiker();
  if (gebruiker?.rol !== "staf") return;
  const wedstrijdId = String(formData.get("wedstrijd_id") ?? "");
  if (!wedstrijdId) return;

  const supabase = await createClient();
  const { data: huidige } = await supabase
    .from("wedstrijd_verslag").select("foto_pad").eq("wedstrijd_id", wedstrijdId).maybeSingle();
  const pad = (huidige as { foto_pad?: string | null } | null)?.foto_pad;
  if (!pad) return;
  await supabase.from("wedstrijd_verslag").update({ foto_pad: null } as never).eq("wedstrijd_id", wedstrijdId);
  await supabase.storage.from("verslagfotos").remove([pad]);
  revalidatePath(`/staf/wedstrijd/${wedstrijdId}/verslag`);
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
