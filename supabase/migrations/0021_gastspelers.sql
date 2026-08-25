-- ============================================================================
-- Treenio — migratie 0021: gastspelers
-- ----------------------------------------------------------------------------
-- Een gastspeler (bijv. een JO16-speler die één keer meedoet) wordt vanaf de
-- opstelling-pagina toegevoegd en telt gewoon mee in opstelling, live-
-- registratie en het verslag. Hij blijft buiten de trainingen-presentie en de
-- seizoensstart-vragenlijst.
-- Draai dit in de SQL editor van het Supabase-dashboard.
-- ============================================================================

alter table public.spelers add column if not exists gast boolean not null default false;

-- Vragenlijst-naamlijst: gastspelers niet tonen.
create or replace function public.vragenlijst_spelers()
returns table (id uuid, naam text, rugnummer integer)
language sql stable security definer set search_path = public as $$
  select s.id, s.naam, s.rugnummer
  from public.spelers s
  where not coalesce(s.gast, false)
    and not exists (
      select 1 from public.vragenlijst_antwoorden a where a.speler_id = s.id
    )
  order by s.naam;
$$;

notify pgrst, 'reload schema';
