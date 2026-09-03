-- ============================================================================
-- Treenio — migratie 0028: materiaaldienst
-- ----------------------------------------------------------------------------
-- Elke week zijn twee spelers verantwoordelijk voor de materialen. Het
-- rooster zelf wordt uitgerekend (alfabetisch, doorlopend); hier staat alleen
-- wat de staf aanraakt: een week afgevinkt, een vakantieweek, of een
-- handmatig gekozen duo.
-- Draai dit in de SQL editor van het Supabase-dashboard.
-- ============================================================================

create table if not exists public.materiaaldienst_weken (
  week_start  date primary key,                      -- de maandag van de week
  speler_a    uuid references public.spelers (id) on delete set null,
  speler_b    uuid references public.spelers (id) on delete set null,
  vakantie    boolean not null default false,
  gedaan      boolean not null default false,
  handmatig   boolean not null default false,
  created_at  timestamptz not null default now()
);

alter table public.materiaaldienst_weken enable row level security;

create policy "materiaaldienst_select_staf"
  on public.materiaaldienst_weken for select to authenticated using (public.is_staf());
create policy "materiaaldienst_insert_staf"
  on public.materiaaldienst_weken for insert to authenticated with check (public.is_staf());
create policy "materiaaldienst_update_staf"
  on public.materiaaldienst_weken for update to authenticated
  using (public.is_staf()) with check (public.is_staf());
create policy "materiaaldienst_delete_staf"
  on public.materiaaldienst_weken for delete to authenticated using (public.is_staf());

notify pgrst, 'reload schema';
