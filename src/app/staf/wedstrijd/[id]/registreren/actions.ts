"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getHuidigeGebruiker } from "@/lib/auth";

export interface ActieResultaat {
  ok: boolean;
  error?: string;
}

export interface WedstrijdRegPayload {
  wedstrijd_id: string;
  speler_id: string;
  op_tijd: boolean | null;
  afmeld_status: string;
  startte_als: string;
  positie: string | null;
  speelminuten: number;
  gewisseld_uit: boolean;
  ingevallen: boolean;
  volledige_bank: boolean;
  goals: number;
  assists: number;
  gele_kaarten: number;
  rode_kaart: boolean;
  overtredingen_gemaakt: number;
  overtredingen_tegen: number;
  balverlies: number;
  man_of_the_match: boolean;
  balcontacten_voor_assist: number;
  duels_gewonnen: number;
  duels_verloren: number;
}

export interface ScoutingPayload {
  wedstrijd_id: string;
  systeem_tegenstander: string | null;
  drukzetten: string | null;
  zwakke_schakel: string | null;
  uitblinkers: string | null;
  eigen_opmerking: string | null;
}

export interface KeeperRegPayload {
  wedstrijd_id: string;
  speler_id: string;
  hoge_ballen_gepakt: number;
  reddingen: number;
  een_op_een_reddingen: number;
  reddingen_buiten_16: number;
  tegengoals: number;
  clean_sheet: boolean;
  uittrappen_lang: number;
  opbouw_van_achteruit: number;
}

export interface TeamStatsPayload {
  wedstrijd_id: string;
  vrije_trappen_tegen: number;
  corners_tegen: number;
  goals_uit_spel: number;
  goals_uit_standaard: number;
  tegengoals_uit_spel: number;
  tegengoals_uit_standaard: number;
}

async function vereisStaf() {
  const gebruiker = await getHuidigeGebruiker();
  return gebruiker?.rol === "staf";
}

export async function upsertWedstrijdRegistratie(
  payload: WedstrijdRegPayload,
): Promise<ActieResultaat> {
  if (!(await vereisStaf())) return { ok: false, error: "Geen toegang." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("wedstrijd_registraties")
    // Database-types zijn handgeschreven; cast tot we `supabase gen types` draaien.
    .upsert(payload as never, { onConflict: "wedstrijd_id,speler_id" });

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/staf/wedstrijd/${payload.wedstrijd_id}/registreren`);
  return { ok: true };
}

export async function upsertKeeperRegistratie(
  payload: KeeperRegPayload,
): Promise<ActieResultaat> {
  if (!(await vereisStaf())) return { ok: false, error: "Geen toegang." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("keeper_registraties")
    .upsert(payload as never, { onConflict: "wedstrijd_id,speler_id" });

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/staf/wedstrijd/${payload.wedstrijd_id}/registreren`);
  return { ok: true };
}

export async function upsertScouting(
  payload: ScoutingPayload,
): Promise<ActieResultaat> {
  if (!(await vereisStaf())) return { ok: false, error: "Geen toegang." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("wedstrijd_scouting")
    .upsert(payload as never, { onConflict: "wedstrijd_id" });

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/staf/wedstrijd/${payload.wedstrijd_id}/registreren`);
  return { ok: true };
}

export interface VerslagPayload {
  wedstrijd_id: string;
  ging_goed: string | null;
  kan_beter: string | null;
  voor_training: string | null;
}

export async function upsertVerslag(
  payload: VerslagPayload,
): Promise<ActieResultaat> {
  if (!(await vereisStaf())) return { ok: false, error: "Geen toegang." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("wedstrijd_verslag")
    .upsert(payload as never, { onConflict: "wedstrijd_id" });

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/staf/wedstrijd/${payload.wedstrijd_id}/registreren`);
  return { ok: true };
}

export async function upsertTeamStats(
  payload: TeamStatsPayload,
): Promise<ActieResultaat> {
  if (!(await vereisStaf())) return { ok: false, error: "Geen toegang." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("wedstrijd_team_stats")
    .upsert(payload as never, { onConflict: "wedstrijd_id" });

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/staf/wedstrijd/${payload.wedstrijd_id}/registreren`);
  return { ok: true };
}
