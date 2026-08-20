-- ============================================================================
-- Treenio — migratie 0020: verwijderde trainingsdagen blijven verwijderd
-- ----------------------------------------------------------------------------
-- Het kruisje verwijderde een training, maar "Genereer di/do trainingen"
-- maakte diezelfde datum daarna gewoon opnieuw aan. Deze tabel onthoudt de
-- bewust verwijderde datums zodat de generator ze overslaat.
-- Draai dit in de SQL editor van het Supabase-dashboard.
-- ============================================================================

create table if not exists public.training_uitzonderingen (
  datum date primary key,
  created_at timestamptz not null default now()
);

alter table public.training_uitzonderingen enable row level security;

create policy "tu_select" on public.training_uitzonderingen for select to authenticated
  using (public.is_staf());
create policy "tu_insert" on public.training_uitzonderingen for insert to authenticated
  with check (public.is_staf());
create policy "tu_delete" on public.training_uitzonderingen for delete to authenticated
  using (public.is_staf());

notify pgrst, 'reload schema';
