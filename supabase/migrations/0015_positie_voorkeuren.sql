-- ============================================================================
-- Treenio — migratie 0015: positie-inventarisatie onder de trainers
-- ----------------------------------------------------------------------------
-- Elke trainer vult per speler een 1e/2e/3e positie in, per systeem (4-3-3 /
-- 4-4-2). Een trainer ziet alleen zijn eigen invulling; alleen wie
-- mag_conclusie heeft, mag alles zien (de conclusie/ideaal-elftal).
-- ============================================================================

alter table public.staf
  add column if not exists mag_conclusie boolean not null default false;

create table if not exists public.positie_voorkeuren (
  id          uuid primary key default gen_random_uuid(),
  staf_id     uuid not null references public.staf (id) on delete cascade,
  speler_id   uuid not null references public.spelers (id) on delete cascade,
  systeem     text not null check (systeem in ('4-3-3', '4-4-2')),
  positie_1   text,
  positie_2   text,
  positie_3   text,
  created_at  timestamptz not null default now(),
  unique (staf_id, speler_id, systeem)
);

-- Helpers (security definer, om RLS-recursie te vermijden).
create or replace function public.current_staf_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.staf where auth_user_id = auth.uid() limit 1;
$$;

create or replace function public.mag_conclusie_zien()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.staf where auth_user_id = auth.uid() and mag_conclusie);
$$;

alter table public.positie_voorkeuren enable row level security;

-- Lezen: eigen rijen, of alles als je de conclusie mag zien.
create policy "pv_select" on public.positie_voorkeuren for select to authenticated
  using (staf_id = public.current_staf_id() or public.mag_conclusie_zien());
-- Schrijven: alleen je eigen rijen.
create policy "pv_insert" on public.positie_voorkeuren for insert to authenticated
  with check (staf_id = public.current_staf_id());
create policy "pv_update" on public.positie_voorkeuren for update to authenticated
  using (staf_id = public.current_staf_id()) with check (staf_id = public.current_staf_id());
create policy "pv_delete" on public.positie_voorkeuren for delete to authenticated
  using (staf_id = public.current_staf_id());

notify pgrst, 'reload schema';
