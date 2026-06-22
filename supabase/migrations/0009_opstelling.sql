-- ============================================================================
-- Treenio — migratie 0009: opstelling / formatiebord per wedstrijd
-- ----------------------------------------------------------------------------
-- Eén opstelling per wedstrijd. veld = { slotKey: speler_id }, bank = [speler_id].
-- Alles staf-only.
-- ============================================================================

create table if not exists public.wedstrijd_opstelling (
  id            uuid primary key default gen_random_uuid(),
  wedstrijd_id  uuid not null unique references public.wedstrijden (id) on delete cascade,
  formatie      text not null default '4-3-3',
  veld          jsonb not null default '{}'::jsonb,
  bank          jsonb not null default '[]'::jsonb,
  created_at    timestamptz not null default now()
);

alter table public.wedstrijd_opstelling enable row level security;

create policy "opstelling_select_staf"
  on public.wedstrijd_opstelling for select to authenticated using (public.is_staf());
create policy "opstelling_insert_staf"
  on public.wedstrijd_opstelling for insert to authenticated with check (public.is_staf());
create policy "opstelling_update_staf"
  on public.wedstrijd_opstelling for update to authenticated
  using (public.is_staf()) with check (public.is_staf());
create policy "opstelling_delete_staf"
  on public.wedstrijd_opstelling for delete to authenticated using (public.is_staf());

notify pgrst, 'reload schema';
