// Handgeschreven types die het schema uit supabase/migrations/0001_init.sql
// weerspiegelen. Wil je dit later genereren:
//   supabase gen types typescript --project-id <id> > src/lib/types/database.ts

export type Rol = "hoofdtrainer" | "assistent";
export type DoelStatus = "open" | "bezig" | "behaald" | "gepauzeerd";
export type AfmeldStatus =
  | "op_tijd"
  | "kort_dag"
  | "te_laat"
  | "niet_afgemeld"
  | "nvt";
export type StarteAls = "basis" | "wissel" | "niet_in_selectie";

export interface Speler {
  id: string;
  auth_user_id: string | null;
  naam: string;
  rugnummer: number | null;
  positie_voorkeur: string | null;
  hoofdpositie: string | null;
  alt_positie_1: string | null;
  alt_positie_2: string | null;
  foto_url: string | null;
  geboortedatum: string | null;
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
  created_at: string;
}

export interface Staf {
  id: string;
  auth_user_id: string | null;
  naam: string;
  rol: Rol;
  created_at: string;
}

export interface Wedstrijd {
  id: string;
  datum: string;
  tegenstander: string;
  uitslag: string | null;
  bron_id: string | null;
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
  op_tijd: boolean | null;
  afmeld_status: AfmeldStatus;
  afgemeld_op: string | null;
  inzet: number | null;
  opmerking: string | null;
  created_at: string;
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
    };
    Views: Record<string, never>;
    Functions: {
      is_staf: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: Record<string, never>;
  };
}
