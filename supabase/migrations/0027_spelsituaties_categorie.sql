-- ============================================================================
-- Treenio — migratie 0027: categorie op spelsituaties
-- ----------------------------------------------------------------------------
-- Het overzicht toont tegels per categorie (opbouw, positiespel, afwerken,
-- enzovoort). Bestaande situaties vallen onder "Overig". De lijst met
-- categorieën staat in de app (src/lib/tactiek/categorieen.ts).
-- ============================================================================

alter table public.spelsituaties
  add column if not exists categorie text not null default 'Overig';

create index if not exists spelsituaties_categorie_idx
  on public.spelsituaties (categorie);

notify pgrst, 'reload schema';
