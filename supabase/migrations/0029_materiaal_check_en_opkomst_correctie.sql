-- ============================================================================
-- Treenio — migratie 0029: materiaal-check bij presentie + gecorrigeerde opkomst
-- ----------------------------------------------------------------------------
-- 1) training_registraties.materiaal_ontbreekt: 1 vinkje voor "scheenbescher-
--    mers/bidon niet in orde" bij een training.
-- 2) v_training_opkomst_gecorrigeerd: per maand telt elke 2x te laat als 1x
--    minder aanwezig; apart naast de bestaande (rauwe) opkomst-%.
-- Draai dit in de SQL editor van het Supabase-dashboard.
-- ============================================================================

-- 1) Materiaal-check bij training presentie -----------------------------------
alter table public.training_registraties
  add column if not exists materiaal_ontbreekt boolean not null default false;

-- 2) Gecorrigeerde opkomst ------------------------------------------------------
-- Maand-opkomst uitgebreid met het aantal keer te laat in die maand.
create or replace view public.v_training_opkomst_maand
with (security_invoker = on) as
select
  tr.speler_id,
  to_char(t.datum, 'YYYY-MM')                                        as maand,
  count(*) filter (where tr.status is not null)                      as geregistreerd,
  count(*) filter (where tr.status in ('aanwezig', 'te_laat', 'te_laat_met')) as aanwezig,
  count(*) filter (where tr.status in ('te_laat', 'te_laat_met'))     as te_laat,
  round(100.0 * count(*) filter (where tr.status in ('aanwezig', 'te_laat', 'te_laat_met'))
        / nullif(count(*) filter (where tr.status is not null), 0))  as opkomst_pct
from public.training_registraties tr
join public.trainingen t on t.id = tr.training_id
where tr.status is not null
group by tr.speler_id, to_char(t.datum, 'YYYY-MM');

-- Seizoenstotaal met de "2x te laat = 1x minder aanwezig"-correctie, per
-- maand toegepast en dan opgeteld (zodat het steeds per kalendermaand reset).
create or replace view public.v_training_opkomst_gecorrigeerd
with (security_invoker = on) as
select
  m.speler_id,
  sum(m.geregistreerd)                                     as geregistreerd,
  sum(greatest(m.aanwezig - (m.te_laat / 2), 0))            as aanwezig_gecorrigeerd,
  round(100.0 * sum(greatest(m.aanwezig - (m.te_laat / 2), 0))
        / nullif(sum(m.geregistreerd), 0))                 as opkomst_pct_gecorrigeerd
from public.v_training_opkomst_maand m
group by m.speler_id;

notify pgrst, 'reload schema';
