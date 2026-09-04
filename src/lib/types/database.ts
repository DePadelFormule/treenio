// Handgeschreven types die het schema uit supabase/migrations/0001_init.sql
// weerspiegelen. Wil je dit later genereren:
//   supabase gen types typescript --project-id <id> > src/lib/types/database.ts

import type { PlayData } from "@/lib/tactiek/types";

export type Rol = "hoofdtrainer" | "assistent";
export type DoelStatus = "open" | "bezig" | "behaald" | "gepauzeerd";
export type AfmeldStatus =
  | "op_tijd"
  | "kort_dag"
  | "te_laat"
  | "niet_afgemeld"
  | "nvt";
export type StarteAls = "basis" | "wissel" | "niet_in_selectie";
export type Beschikbaarheid = "fit" | "twijfel" | "geblesseerd";
export type PresentieStatus =
  | "aanwezig"
  | "te_laat"
  | "te_laat_met"
  | "afwezig_met"
  | "afwezig_zonder"
  | "blessure"
  | "vakantie";

export interface Speler {
  id: string;
  auth_user_id: string | null;
  naam: string;
  rugnummer: number | null;
  positie_voorkeur: string | null;
  hoofdpositie: string | null;
  alt_positie_1: string | null;
  alt_positie_2: string | null;
  beschikbaarheid: Beschikbaarheid;
  blessure_notitie: string | null;
  foto_url: string | null;
  geboortedatum: string | null;
  // Gastspeler (doet incidenteel mee met wedstrijden; geen trainingen/vragenlijst).
  // Optioneel getypt zodat de app ook werkt vóórdat migratie 0021 is gedraaid.
  gast?: boolean;
  created_at: string;
}

export interface WedstrijdVerslag {
  id: string;
  wedstrijd_id: string;
  ging_goed: string | null;
  kan_beter: string | null;
  voor_training: string | null;
  created_at: string;
}

export interface Aandachtspunt {
  id: string;
  speler_id: string;
  tekst: string;
  opgelost: boolean;
  coach_id: string | null;
  created_at: string;
}

export interface WedstrijdScouting {
  id: string;
  wedstrijd_id: string;
  systeem_tegenstander: string | null;
  drukzetten: "hoog" | "inzakken" | "wisselend" | null;
  zwakke_schakel: string | null;
  uitblinkers: string | null;
  eigen_opmerking: string | null;
  // Optioneel getypt zodat de app ook werkt vóórdat migratie 0024 is gedraaid.
  omschakeling?: string | null;
  standaardsituaties?: string | null;
  created_at: string;
}

export interface WedstrijdOpstelling {
  id: string;
  wedstrijd_id: string;
  formatie: string;
  veld: Record<string, string>; // slotKey → speler_id
  bank: string[]; // speler_id[]
  // Teamtaken voor deze wedstrijd (één per regel). Optioneel getypt (migratie 0025).
  teamtaken?: string | null;
  created_at: string;
}

/**
 * Oud bordformaat (tokens in procenten). Nieuwe situaties slaan PlayData op
 * (zie lib/tactiek/types); oude rijen worden bij het openen omgezet.
 */
export type BordTeam = "eigen" | "tegenstander" | "bal";
export interface BordToken {
  id: string;
  team: BordTeam;
  label: string;
}
export type BordFrame = Record<string, { x: number; y: number }>;
export interface BordData {
  tokens: BordToken[];
  frames: BordFrame[];
}
export type EventType =
  | "goal" | "assist" | "geel" | "rood"
  | "wissel_in" | "wissel_uit" | "tegengoal" | "einde";

export interface WedstrijdEvent {
  id: string;
  wedstrijd_id: string;
  speler_id: string | null;
  type: EventType;
  minuut: number;
  created_at: string;
}

export interface Spelsituatie {
  id: string;
  titel: string;
  uitleg: string | null;
  half_veld: boolean;
  /** Een van de categorieën uit lib/tactiek/categorieen; "Overig" als vangnet. */
  categorie: string;
  /** PlayData in meters, of het oude BordData bij situaties van voor het nieuwe tekenbord. */
  data: PlayData | BordData;
  created_at: string;
}

export interface Staf {
  id: string;
  auth_user_id: string | null;
  naam: string;
  rol: Rol;
  mag_conclusie: boolean;
  created_at: string;
}

export type Systeem = "4-3-3" | "4-4-2";

export interface PositieVoorkeur {
  id: string;
  staf_id: string;
  speler_id: string;
  systeem: Systeem;
  positie_1: string | null;
  positie_2: string | null;
  positie_3: string | null;
  created_at: string;
}

// Vriendschappelijke wedstrijden tellen niet mee in de seizoensstatistieken.
export type WedstrijdType = "competitie" | "beker" | "vriendschappelijk";

export interface Wedstrijd {
  id: string;
  datum: string;
  tegenstander: string;
  uitslag: string | null;
  bron_id: string | null;
  // Optioneel getypt zodat de app ook werkt vóórdat migratie 0022 is gedraaid.
  type?: WedstrijdType;
  // Aanvangstijd "HH:MM". Optioneel getypt (migratie 0023).
  tijd?: string | null;
  created_at: string;
}

export interface Ontwikkeldoel {
  id: string;
  speler_id: string;
  doel: string;
  status: DoelStatus;
  afgesproken_op: string;
  coach_id: string | null;
  created_at: string;
}

export interface StafNotitie {
  id: string;
  speler_id: string;
  inschatting: string | null;
  verwachting: string | null;
  positie_inschatting: string | null;
  coach_id: string | null;
  created_at: string;
}

// ---- Staf-registratielaag (migraties 0002–0004) ---------------------------

export interface Training {
  id: string;
  datum: string;
  type: string | null;
  omschrijving: string | null;
  created_at: string;
}

export interface TrainingRegistratie {
  id: string;
  training_id: string;
  speler_id: string;
  aanwezig: boolean;
  status: PresentieStatus | null;
  op_tijd: boolean | null;
  afmeld_status: AfmeldStatus;
  afgemeld_op: string | null;
  inzet: number | null;
  opmerking: string | null;
  // Scheenbeschermers/bidon niet in orde. Optioneel getypt (migratie 0029).
  materiaal_ontbreekt?: boolean;
  created_at: string;
}

export interface MateriaaldienstSessie {
  id: string;
  training_id: string | null;
  wedstrijd_id: string | null;
  volgorde: number;
  speler_1_id: string;
  speler_2_id: string;
  speler_1_gedaan: boolean;
  speler_2_gedaan: boolean;
  created_at: string;
}

export interface TrainingOpkomstMaandView {
  speler_id: string;
  maand: string; // YYYY-MM
  geregistreerd: number;
  aanwezig: number;
  te_laat: number;
  opkomst_pct: number | null;
}

// Seizoenstotaal met "2x te laat = 1x minder aanwezig" verrekend (migratie 0029).
export interface TrainingOpkomstGecorrigeerdView {
  speler_id: string;
  geregistreerd: number;
  aanwezig_gecorrigeerd: number;
  opkomst_pct_gecorrigeerd: number | null;
}

export interface WedstrijdRegistratie {
  id: string;
  wedstrijd_id: string;
  speler_id: string;
  op_tijd: boolean | null;
  afmeld_status: AfmeldStatus;
  startte_als: StarteAls;
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
  opmerking: string | null;
  created_at: string;
}

export interface KeeperRegistratie {
  id: string;
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
  opmerking: string | null;
  created_at: string;
}

export interface WedstrijdTeamStats {
  id: string;
  wedstrijd_id: string;
  vrije_trappen_tegen: number;
  corners_tegen: number;
  goals_uit_spel: number;
  goals_uit_standaard: number;
  tegengoals_uit_spel: number;
  tegengoals_uit_standaard: number;
  created_at: string;
}

// Staf-aggregatie-views (read-only)
export interface TrainingOpkomstView {
  speler_id: string;
  speler_naam: string;
  geregistreerd: number;
  aanwezig: number;
  opkomst_pct: number | null;
  gem_inzet: number | null;
  afgemeld_op_tijd: number;
  afgemeld_te_laat: number;
  te_laat_gekomen: number;
}

export interface WedstrijdTotalenView {
  speler_id: string;
  speler_naam: string;
  in_selectie: number;
  basisplaatsen: number;
  invalbeurten: number;
  keer_uit_gewisseld: number;
  keer_90_bank: number;
  totaal_minuten: number;
  goals: number;
  assists: number;
  gele_kaarten: number;
  rode_kaarten: number;
  overtredingen_gemaakt: number;
  overtredingen_tegen: number;
  balverlies: number;
  man_of_the_match: number;
  balcontacten_voor_assist: number;
  duels_gewonnen: number;
  duels_verloren: number;
}

export interface SpelerPositieView {
  speler_id: string;
  positie: string;
  aantal: number;
}

export interface KeeperTotalenView {
  speler_id: string;
  speler_naam: string;
  wedstrijden_keep: number;
  clean_sheets: number;
  hoge_ballen_gepakt: number;
  reddingen: number;
  een_op_een_reddingen: number;
  reddingen_buiten_16: number;
  tegengoals: number;
  uittrappen_lang: number;
  opbouw_van_achteruit: number;
}

// Een bewaarde AI-les uit de lesgenerator. `les` is het volledige lesblad
// (JSON volgens het schema in lesgenerator/schema.ts).
export interface OpgeslagenLes {
  id: string;
  titel: string;
  sport: string;
  onderwerp: string;
  datum: string | null;
  les: unknown;
  created_at: string;
}

// ---- Academy (handboek + optionele quiz per hoofdstuk, migratie 0026) -----

export interface AcademyHoofdstuk {
  id: string;
  titel: string;
  volgorde: number;
  created_at: string;
}

export interface AcademySectie {
  id: string;
  hoofdstuk_id: string;
  titel: string | null;
  tekst: string;
  volgorde: number;
  created_at: string;
}

export type AcademyVraagType = "meerkeuze" | "stelling";

// Staf-weergave: bevat het juiste antwoord (juist_index).
export interface AcademyQuizvraag {
  id: string;
  hoofdstuk_id: string;
  type: AcademyVraagType;
  vraag: string;
  opties: string[];
  juist_index: number;
  volgorde: number;
  created_at: string;
}

// Publieke weergave (via de RPC academy_quiz_vragen): zonder juist_index.
export interface AcademyVraagPubliek {
  id: string;
  type: AcademyVraagType;
  vraag: string;
  opties: string[];
  volgorde: number;
}

export interface AcademyQuizResultaat {
  id: string;
  hoofdstuk_id: string;
  speler_id: string;
  score: number;
  totaal: number;
  fout_vraag_ids: string[];
  created_at: string;
}

// Antwoorden op de seizoensstart-vragenlijst (één rij per speler).
export interface VragenlijstAntwoorden {
  id: string;
  speler_id: string;
  antwoorden: Record<string, string>;
  created_at: string;
}

// Minimale Database-shape voor de Supabase client. Voor de MVP houden we het
// pragmatisch; tabellen die we nog niet typen vallen terug op `any` via index.
export interface Database {
  public: {
    Tables: {
      spelers: {
        Row: Speler;
        Insert: Partial<Speler> & { naam: string };
        Update: Partial<Speler>;
      };
      staf: {
        Row: Staf;
        Insert: Partial<Staf> & { naam: string };
        Update: Partial<Staf>;
      };
      wedstrijden: {
        Row: Wedstrijd;
        Insert: Partial<Wedstrijd> & { datum: string; tegenstander: string };
        Update: Partial<Wedstrijd>;
      };
      ontwikkeldoelen: {
        Row: Ontwikkeldoel;
        Insert: Partial<Ontwikkeldoel> & { speler_id: string; doel: string };
        Update: Partial<Ontwikkeldoel>;
      };
      staf_notities: {
        Row: StafNotitie;
        Insert: Partial<StafNotitie> & { speler_id: string };
        Update: Partial<StafNotitie>;
      };
      lessen: {
        Row: OpgeslagenLes;
        Insert: Partial<OpgeslagenLes> & { titel: string; sport: string; onderwerp: string; les: unknown };
        Update: Partial<OpgeslagenLes>;
      };
      vragenlijst_antwoorden: {
        Row: VragenlijstAntwoorden;
        Insert: Partial<VragenlijstAntwoorden> & { speler_id: string; antwoorden: unknown };
        Update: Partial<VragenlijstAntwoorden>;
      };
      training_uitzonderingen: {
        Row: { datum: string; created_at: string };
        Insert: { datum: string };
        Update: { datum?: string };
      };
      academy_hoofdstukken: {
        Row: AcademyHoofdstuk;
        Insert: Partial<AcademyHoofdstuk> & { titel: string };
        Update: Partial<AcademyHoofdstuk>;
      };
      academy_secties: {
        Row: AcademySectie;
        Insert: Partial<AcademySectie> & { hoofdstuk_id: string };
        Update: Partial<AcademySectie>;
      };
      academy_quizvragen: {
        Row: AcademyQuizvraag;
        Insert: Partial<AcademyQuizvraag> & { hoofdstuk_id: string; vraag: string; opties: unknown };
        Update: Partial<AcademyQuizvraag> & { opties?: unknown };
      };
      academy_quiz_resultaten: {
        Row: AcademyQuizResultaat;
        Insert: Partial<AcademyQuizResultaat> & { hoofdstuk_id: string; speler_id: string };
        Update: Partial<AcademyQuizResultaat>;
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_staf: { Args: Record<string, never>; Returns: boolean };
      check_registratie_code: { Args: { code: string }; Returns: boolean };
      vragenlijst_spelers: {
        Args: Record<string, never>;
        Returns: { id: string; naam: string; rugnummer: number | null }[];
      };
      vragenlijst_opslaan: { Args: { p_speler: string; p_antwoorden: unknown }; Returns: undefined };
      academy_quiz_vragen: { Args: { p_hoofdstuk: string }; Returns: AcademyVraagPubliek[] };
      academy_spelers_voor_quiz: {
        Args: { p_hoofdstuk: string };
        Returns: { id: string; naam: string; rugnummer: number | null }[];
      };
      academy_quiz_afronden: {
        Args: { p_hoofdstuk: string; p_speler: string; p_antwoorden: unknown };
        Returns: { score: number; totaal: number }[];
      };
    };
    Enums: Record<string, never>;
  };
}
