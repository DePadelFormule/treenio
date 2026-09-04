-- ============================================================================
-- Treenio — migratie 0030: materiaaldienst per training/wedstrijd, per speler
-- ----------------------------------------------------------------------------
-- Eén rij per training/wedstrijd, met een eigen vinkje per speler — zo kan de
-- een wel en de ander niet afgevinkt worden (bijv. blessure tijdens training).
-- Draai dit in de SQL editor van het Supabase-dashboard.
-- ============================================================================

create table if not exists public.materiaaldienst_sessies (
  id              uuid primary key default gen_random_uuid(),
  training_id     uuid references public.trainingen (id) on delete cascade,
  wedstrijd_id    uuid references public.wedstrijden (id) on delete cascade,
  volgorde        integer not null,
  speler_1_id     uuid not null references public.spelers (id) on delete cascade,
  speler_2_id     uuid not null references public.spelers (id) on delete cascade,
  speler_1_gedaan boolean not null default false,
  speler_2_gedaan boolean not null default false,
  created_at      timestamptz not null default now(),
  constraint materiaaldienst_sessies_een_sessie check (num_nonnulls(training_id, wedstrijd_id) = 1),
  unique (training_id),
  unique (wedstrijd_id)
);

alter table public.materiaaldienst_sessies enable row level security;
create policy "materiaaldienst_sessies_select_staf"
  on public.materiaaldienst_sessies for select to authenticated using (public.is_staf());
create policy "materiaaldienst_sessies_insert_staf"
  on public.materiaaldienst_sessies for insert to authenticated with check (public.is_staf());
create policy "materiaaldienst_sessies_update_staf"
  on public.materiaaldienst_sessies for update to authenticated
  using (public.is_staf()) with check (public.is_staf());
create policy "materiaaldienst_sessies_delete_staf"
  on public.materiaaldienst_sessies for delete to authenticated using (public.is_staf());

notify pgrst, 'reload schema';
