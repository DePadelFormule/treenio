-- ============================================================================
-- Treenio — migratie 0023: aanvangstijd per wedstrijd
-- ----------------------------------------------------------------------------
-- Tekstveld "HH:MM" (bijv. '09:45'). Wordt meegelezen uit het geplakte
-- voetbal.nl-programma en is per wedstrijd aan te passen in de lijst.
-- Draai dit in de SQL editor van het Supabase-dashboard.
-- ============================================================================

alter table public.wedstrijden
  add column if not exists tijd text
    check (tijd is null or tijd ~ '^[0-2][0-9]:[0-5][0-9]$');

notify pgrst, 'reload schema';
