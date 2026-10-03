-- ============================================================================
-- Treenio — migratie 0036: eigen doelpunt + aanleiding (corner/vrije trap/penalty)
-- ----------------------------------------------------------------------------
-- Live wedstrijdregistratie kon een eigen doelpunt nog niet apart vastleggen
-- (voor óns gemaakt door de tegenstander, of tegen óns door een eigen speler),
-- en geen enkel doelpunt kon getagd worden als corner/vrije trap/penalty.
-- Draai dit in de SQL editor van het Supabase-dashboard.
-- ============================================================================

alter table public.wedstrijd_events drop constraint if exists wedstrijd_events_type_check;
alter table public.wedstrijd_events add constraint wedstrijd_events_type_check check (type in
  ('goal', 'assist', 'geel', 'rood', 'wissel_in', 'wissel_uit', 'tegengoal', 'einde',
   'eigen_doelpunt_voor', 'eigen_doelpunt_tegen'));

alter table public.wedstrijd_events
  add column if not exists aanleiding text check (aanleiding in ('corner', 'vrije_trap', 'penalty'));

notify pgrst, 'reload schema';
