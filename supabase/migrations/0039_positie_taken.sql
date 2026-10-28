-- ============================================================================
-- Treenio — migratie 0039: taken per positie (printbare kaartjes)
-- ----------------------------------------------------------------------------
-- Eén rij per positie × situatie. taken = vrije tekst, één taak per regel.
-- Begint met situatie "balbezit_tegenstander" voor het 4-3-3. Staf-only.
-- ============================================================================

create table if not exists public.positie_taken (
  id            uuid primary key default gen_random_uuid(),
  positie_code  text not null,
  situatie      text not null,
  taken         text,
  created_at    timestamptz not null default now(),
  unique (positie_code, situatie)
);

alter table public.positie_taken enable row level security;

create policy "positie_taken_select_staf"
  on public.positie_taken for select to authenticated using (public.is_staf());
create policy "positie_taken_insert_staf"
  on public.positie_taken for insert to authenticated with check (public.is_staf());
create policy "positie_taken_update_staf"
  on public.positie_taken for update to authenticated
  using (public.is_staf()) with check (public.is_staf());
create policy "positie_taken_delete_staf"
  on public.positie_taken for delete to authenticated using (public.is_staf());

notify pgrst, 'reload schema';
