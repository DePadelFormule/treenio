-- ============================================================================
-- Treenio — migratie 0012: eenvoudige presentie-status per training
-- ----------------------------------------------------------------------------
-- Voegt één status-veld toe aan training_registraties voor het presentie-
-- rooster: aanwezig / afgemeld (met bericht) / niet afgemeld / blessure.
-- 'aanwezig' (bool) blijft in sync, zodat de opkomst-view blijft werken.
-- ============================================================================

alter table public.training_registraties
  add column if not exists status text
    check (status in ('aanwezig', 'afwezig_met', 'afwezig_zonder', 'blessure'));

-- Opkomst per speler per maand (YYYY-MM), voor de spelerskaart en het overzicht.
create or replace view public.v_training_opkomst_maand
with (security_invoker = on) as
select
  tr.speler_id,
  to_char(t.datum, 'YYYY-MM')                            as maand,
  count(*)                                               as geregistreerd,
  count(*) filter (where tr.status = 'aanwezig')         as aanwezig,
  round(100.0 * count(*) filter (where tr.status = 'aanwezig')
        / nullif(count(*), 0))                           as opkomst_pct
from public.training_registraties tr
join public.trainingen t on t.id = tr.training_id
where tr.status is not null
group by tr.speler_id, to_char(t.datum, 'YYYY-MM');

notify pgrst, 'reload schema';
