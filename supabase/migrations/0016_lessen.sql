-- ============================================================================
-- Treenio — migratie 0016: lessenarchief
-- ----------------------------------------------------------------------------
-- Gegenereerde AI-lessen bewaren zodat ze herbruikbaar zijn (herhaling!) en
-- gekoppeld kunnen worden aan een trainingsdatum. Staf-only (Laag 3-scope).
-- Draai dit in de SQL editor van het Supabase-dashboard.
-- ============================================================================

create table if not exists public.lessen (
  id uuid primary key default gen_random_uuid(),
  titel text not null,
  sport text not null,
  onderwerp text not null,
  datum date,                       -- optioneel: de trainingsdatum waar de les bij hoort
  les jsonb not null,               -- het volledige lesblad zoals gegenereerd
  created_at timestamptz not null default now()
);

alter table public.lessen enable row level security;

create policy "lessen_select" on public.lessen for select to authenticated
  using (public.is_staf());
create policy "lessen_insert" on public.lessen for insert to authenticated
  with check (public.is_staf());
create policy "lessen_delete" on public.lessen for delete to authenticated
  using (public.is_staf());

notify pgrst, 'reload schema';
