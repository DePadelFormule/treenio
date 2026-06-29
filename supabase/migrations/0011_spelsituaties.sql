-- ============================================================================
-- Treenio — migratie 0011: tactisch tekenbord / spelsituaties
-- ----------------------------------------------------------------------------
-- Eén rij per spelsituatie. data = { tokens:[...], frames:[{tokenId:{x,y}}] }.
-- Staf-only.
-- ============================================================================

create table if not exists public.spelsituaties (
  id          uuid primary key default gen_random_uuid(),
  titel       text not null,
  uitleg      text,
  half_veld   boolean not null default false,
  data        jsonb not null default '{"tokens":[],"frames":[{}]}'::jsonb,
  created_at  timestamptz not null default now()
);

alter table public.spelsituaties enable row level security;

create policy "spelsituaties_select_staf"
  on public.spelsituaties for select to authenticated using (public.is_staf());
create policy "spelsituaties_insert_staf"
  on public.spelsituaties for insert to authenticated with check (public.is_staf());
create policy "spelsituaties_update_staf"
  on public.spelsituaties for update to authenticated
  using (public.is_staf()) with check (public.is_staf());
create policy "spelsituaties_delete_staf"
  on public.spelsituaties for delete to authenticated using (public.is_staf());

notify pgrst, 'reload schema';
