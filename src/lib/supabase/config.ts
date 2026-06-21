// Centrale plek voor de Supabase-verbindingsgegevens.
// Ondersteunt zowel de nieuwe "publishable"-sleutel als de oude anon-sleutel,
// zodat het werkt ongeacht welke naam je in de omgeving zet.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

export const SUPABASE_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)!;
