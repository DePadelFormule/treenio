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
  foto_url: string | null;
  geboortedatum: string | null;
  created_at: string;
}

export interface Staf {
  id: string;
  auth_user_id: string | null;
  naam: string;
  rol: Rol;
  created_at: string;
}

export interface Badge {
  id: string;
  speler_id: string;
  type: string;
  behaald_op: string;
  created_at: string;
}

export interface Wedstrijd {
  id: string;
  datum: string;
  tegenstander: string;
  uitslag: string | null;
  created_at: string;
}

export interface MvpStem {
  id: string;
  wedstrijd_id: string;
  stemmer_speler_id: string;
  gestemd_op_speler_id: string;
  gestemd_op: string;
}

export interface Challenge {
  id: string;
  titel: string;
  omschrijving: string | null;
  week: number | null;
  deadline: string | null;
  created_at: string;
}

export interface ChallengeUpload {
  id: string;
  challenge_id: string;
  speler_id: string;
  video_url: string;
  ingeleverd_op: string;
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

// ---- Migratie 0002: staf-registratielaag + publieke awards ----------------

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

export interface SeizoenAward {
  id: string;
  seizoen: string;
  categorie: string;
  speler_id: string;
  toelichting: string | null;
  toegekend_op: string;
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
}

export interface SpelerRecord {
  id: string;
  speler_id: string;
  soort: string;
  waarde: number;
  behaald_op: string;
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
      badges: {
        Row: Badge;
        Insert: Partial<Badge> & { speler_id: string; type: string };
        Update: Partial<Badge>;
      };
      records: {
        Row: SpelerRecord;
        Insert: Partial<SpelerRecord> & { speler_id: string; soort: string; waarde: number };
        Update: Partial<SpelerRecord>;
      };
      wedstrijden: {
        Row: Wedstrijd;
        Insert: Partial<Wedstrijd> & { datum: string; tegenstander: string };
        Update: Partial<Wedstrijd>;
      };
      mvp_stemmen: {
        Row: MvpStem;
        Insert: Partial<MvpStem> & {
          wedstrijd_id: string;
          stemmer_speler_id: string;
          gestemd_op_speler_id: string;
        };
        Update: Partial<MvpStem>;
      };
      challenges: {
        Row: Challenge;
        Insert: Partial<Challenge> & { titel: string };
        Update: Partial<Challenge>;
      };
      challenge_uploads: {
        Row: ChallengeUpload;
        Insert: Partial<ChallengeUpload> & {
          challenge_id: string;
          speler_id: string;
          video_url: string;
        };
        Update: Partial<ChallengeUpload>;
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
      current_speler_id: { Args: Record<string, never>; Returns: string | null };
    };
    Enums: Record<string, never>;
  };
}
