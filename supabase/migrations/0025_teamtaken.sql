-- ============================================================================
-- Treenio — migratie 0025: teamtaken bij de opstelling
-- ----------------------------------------------------------------------------
-- Drie teamtaken per wedstrijd (vrij tekstveld, één taak per regel). Staat op
-- het papieren opstellingsformulier en op de opstelling-pagina.
-- Draai dit in de SQL editor van het Supabase-dashboard.
-- ============================================================================

alter table public.wedstrijd_opstelling
  add column if not exists teamtaken text;

notify pgrst, 'reload schema';
