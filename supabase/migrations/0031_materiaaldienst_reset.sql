-- ============================================================================
-- Treenio — migratie 0031: materiaaldienst opnieuw opbouwen
-- ----------------------------------------------------------------------------
-- De eerdere generatie (vóór de bugfix) kende per training/wedstrijd een
-- eigen duo toe en hield geen rekening met een startdatum. Nu geldt één duo
-- per week (vanaf 1 september) en gaat de rotatie via een vaste startpositie
-- (Rayhan + Amir voor de eerste week). Tabel leegmaken zodat de app 'm
-- opnieuw en correct opbouwt bij het eerstvolgende bezoek aan de pagina.
-- Draai dit in de SQL editor van het Supabase-dashboard.
-- ============================================================================

delete from public.materiaaldienst_sessies;

notify pgrst, 'reload schema';
