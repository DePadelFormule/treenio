-- ============================================================================
-- Treenio — migratie 0014: live wedstrijd-events (timer + gebeurtenissen)
-- ----------------------------------------------------------------------------
-- Elk voorval krijgt een minuut. Uit de events + opstelling (basis) worden de
-- speelminuten, goals, assists en kaarten van wedstrijd_registraties afgeleid.
-- Staf-only.
-- ============================================================================

create table if not exists public.wedstrijd_events (
  id            uuid primary key default gen_random_uuid(),
  wedstrijd_id  uuid not null references public.wedstrijden (id) on delete cascade,
  speler_id     uuid references public.spelers (id) on delete cascade, -- null bij team-events (tegengoal/einde)
  type          text not null check (type in
                  ('goal','assist','geel','rood','wissel_in','wissel_uit','tegengoal','einde')),
  minuut        int not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists wedstrijd_events_wedstrijd_idx on public.wedstrijd_events (wedstrijd_id);

alter table public.wedstrijd_events enable row level security;
create policy "events_select_staf" on public.wedstrijd_events for select to authenticated using (public.is_staf());
create policy "events_insert_staf" on public.wedstrijd_events for insert to authenticated with check (public.is_staf());
create policy "events_update_staf" on public.wedstrijd_events for update to authenticated using (public.is_staf()) with check (public.is_staf());
create policy "events_delete_staf" on public.wedstrijd_events for delete to authenticated using (public.is_staf());

notify pgrst, 'reload schema';
