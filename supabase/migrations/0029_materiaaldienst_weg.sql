-- ============================================================================
-- Treenio — migratie 0029: materiaaldienst weer weg
-- ----------------------------------------------------------------------------
-- De materiaaldienst wordt anders geregeld dan met een rooster in de app.
-- Tabel uit migratie 0028 opruimen.
-- Draai dit in de SQL editor van het Supabase-dashboard.
-- ============================================================================

drop table if exists public.materiaaldienst_weken;

notify pgrst, 'reload schema';
