-- ============================================================================
-- Treenio — migratie 0010: beschikbaarheid/blessures + wedstrijdverslag
-- ----------------------------------------------------------------------------
-- Punt 2: huidige fitheidsstatus per speler (fit/twijfel/geblesseerd) + notitie.
-- Punt 4: kort wedstrijdverslag achteraf per wedstrijd.
-- Alles staf-only.
-- ============================================================================

-- Punt 2 — status op de speler
alter table public.spelers
  add column if not exists beschikbaarheid text not null default 'fit'
    check (beschikbaarheid in ('fit', 'twijfel', 'geblesseerd')),
  add column if not exists blessure_notitie text;

-- Punt 4 — wedstrijdverslag (1 per wedstrijd)
create table if not exists public.wedstrijd_verslag (
  id            uuid primary key default gen_random_uuid(),
  wedstrijd_id  uuid not null unique references public.wedstrijden (id) on delete cascade,
  ging_goed     text,
  kan_beter     text,
  voor_training text,
  created_at    timestamptz not null default now()
);

alter table public.wedstrijd_verslag enable row level security;

create policy "verslag_select_staf"
  on public.wedstrijd_verslag for select to authenticated using (public.is_staf());
create policy "verslag_insert_staf"
  on public.wedstrijd_verslag for insert to authenticated with check (public.is_staf());
create policy "verslag_update_staf"
  on public.wedstrijd_verslag for update to authenticated
  using (public.is_staf()) with check (public.is_staf());
create policy "verslag_delete_staf"
  on public.wedstrijd_verslag for delete to authenticated using (public.is_staf());

notify pgrst, 'reload schema';
