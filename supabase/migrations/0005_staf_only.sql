-- ============================================================================
-- Treenio — migratie 0005: spelerskant verwijderen, app wordt 100% staf-only
-- ----------------------------------------------------------------------------
-- Besluit: het hele speler-/team-publieke deel gaat eruit. Spelers loggen niet
-- meer in; ze zijn voortaan puur gegevens die de staf beheert. Alles wat
-- overblijft is uitsluitend zichtbaar voor de trainersstaf.
--
-- 1) Laag 1 (team-publiek) tabellen worden gedropt.
-- 2) ontwikkeldoelen (oude Laag 2) blijft, maar wordt staf-only.
-- 3) spelers / staf / wedstrijden: select wordt staf-only (was team).
-- 4) Helper current_speler_id() is niet meer nodig en wordt verwijderd.
-- ============================================================================

-- 1) Laag 1 weg (cascade ruimt bijbehorende policies/contraints op).
drop table if exists public.challenge_uploads cascade;
drop table if exists public.challenges        cascade;
drop table if exists public.mvp_stemmen       cascade;
drop table if exists public.records           cascade;
drop table if exists public.badges            cascade;
drop table if exists public.seizoen_awards    cascade;

-- 2) ontwikkeldoelen → staf-only lezen (speler kon dit eerst zien).
drop policy if exists "doelen_select_staf_of_eigen" on public.ontwikkeldoelen;
create policy "doelen_select_staf"
  on public.ontwikkeldoelen for select to authenticated
  using (public.is_staf());

-- 3a) spelers → staf-only (was: team-select + eigen-update).
drop policy if exists "spelers_select_ingelogd"        on public.spelers;
drop policy if exists "spelers_update_staf_of_eigen"   on public.spelers;
create policy "spelers_select_staf"
  on public.spelers for select to authenticated
  using (public.is_staf());
create policy "spelers_update_staf"
  on public.spelers for update to authenticated
  using (public.is_staf()) with check (public.is_staf());

-- 3b) staf → staf-only select (was team).
drop policy if exists "staf_select_ingelogd" on public.staf;
create policy "staf_select_staf"
  on public.staf for select to authenticated
  using (public.is_staf());

-- 3c) wedstrijden → staf-only select (was team).
drop policy if exists "wedstrijden_select_team" on public.wedstrijden;
create policy "wedstrijden_select_staf"
  on public.wedstrijden for select to authenticated
  using (public.is_staf());

-- 4) Ongebruikte helper verwijderen (geen policy verwijst er nog naar).
drop function if exists public.current_speler_id();

notify pgrst, 'reload schema';
