-- ============================================================================
-- Treenio — migratie 0032: materiaaldienst — halen én opruimen apart
-- ----------------------------------------------------------------------------
-- Eén vinkje per speler was niet genoeg: materialen moeten zowel gehaald als
-- opgeruimd worden. Splitst speler_1_gedaan/speler_2_gedaan in twee losse
-- vinkjes per speler.
-- Draai dit in de SQL editor van het Supabase-dashboard.
-- ============================================================================

alter table public.materiaaldienst_sessies
  drop column if exists speler_1_gedaan,
  drop column if exists speler_2_gedaan,
  add column if not exists speler_1_halen boolean not null default false,
  add column if not exists speler_1_opruimen boolean not null default false,
  add column if not exists speler_2_halen boolean not null default false,
  add column if not exists speler_2_opruimen boolean not null default false;

notify pgrst, 'reload schema';
