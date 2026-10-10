-- ============================================================================
-- Treenio — migratie 0037: fases opslaan voor het faseoverzicht
-- ----------------------------------------------------------------------------
-- Een "fase" is een naam + datumrange (bijv. "Fase 1", 1 aug t/m 10 okt),
-- zodat je 'm later terug kunt pakken en met een volgende fase kunt
-- vergelijken. Alleen de range wordt bewaard — de cijfers zelf worden altijd
-- live berekend, zodat ze kloppen met de rest van de app.
-- Draai dit in de SQL editor van het Supabase-dashboard.
-- ============================================================================

create table if not exists public.fases (
  id         uuid primary key default gen_random_uuid(),
  naam       text not null,
  van        date not null,
  tot        date not null,
  created_at timestamptz not null default now()
);

alter table public.fases enable row level security;

create policy "fases_select_staf" on public.fases for select to authenticated using (public.is_staf());
create policy "fases_insert_staf" on public.fases for insert to authenticated with check (public.is_staf());
create policy "fases_delete_staf" on public.fases for delete to authenticated using (public.is_staf());

notify pgrst, 'reload schema';
