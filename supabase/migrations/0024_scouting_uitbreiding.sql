-- ============================================================================
-- Treenio — migratie 0024: tegenstander-scouting uitbreiden
-- ----------------------------------------------------------------------------
-- Extra velden op wedstrijd_scouting: omschakeling/counter en vaste
-- spelmomenten (corners, vrije trappen, inworpen). De tabel zelf bestaat al
-- sinds migratie 0007. Draai dit in de SQL editor van het Supabase-dashboard.
-- ============================================================================

alter table public.wedstrijd_scouting
  add column if not exists omschakeling        text,
  add column if not exists standaardsituaties  text;

notify pgrst, 'reload schema';
