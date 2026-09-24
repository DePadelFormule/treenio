-- ============================================================================
-- Treenio — migratie 0035: lessenarchief bewerken
-- ----------------------------------------------------------------------------
-- Een bewaarde les kon nog niet aangepast worden, alleen verwijderd. Voegt de
-- ontbrekende update-policy toe.
-- Draai dit in de SQL editor van het Supabase-dashboard.
-- ============================================================================

create policy "lessen_update" on public.lessen for update to authenticated
  using (public.is_staf()) with check (public.is_staf());

notify pgrst, 'reload schema';
