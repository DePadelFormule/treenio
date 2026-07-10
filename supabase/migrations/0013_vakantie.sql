-- ============================================================================
-- Treenio — migratie 0013: 'vakantie' als presentie-status + opkomst herzien
-- ----------------------------------------------------------------------------
-- Voegt 'vakantie' toe. Opkomst is status-gebaseerd; vakantie telt gewoon mee
-- als afwezig (in de noemer). Alleen 'aanwezig' telt als aanwezig.
-- ============================================================================

alter table public.training_registraties drop constraint if exists training_registraties_status_check;
alter table public.training_registraties add constraint training_registraties_status_check
  check (status in ('aanwezig', 'afwezig_met', 'afwezig_zonder', 'blessure', 'vakantie'));

-- Elke ingevulde status telt mee in de noemer; alleen 'aanwezig' als aanwezig.
create or replace view public.v_training_opkomst
with (security_invoker = on) as
select
  sp.id                                          as speler_id,
  sp.naam                                        as speler_naam,
  count(tr.id) filter (where tr.status is not null)                  as geregistreerd,
  count(tr.id) filter (where tr.status = 'aanwezig')                 as aanwezig,
  round(100.0 * count(tr.id) filter (where tr.status = 'aanwezig')
        / nullif(count(tr.id) filter (where tr.status is not null), 0)) as opkomst_pct,
  round(avg(tr.inzet) filter (where tr.inzet is not null), 1)        as gem_inzet,
  count(tr.id) filter (where tr.status = 'afwezig_met')              as afgemeld_op_tijd,
  count(tr.id) filter (where tr.status = 'afwezig_zonder')           as afgemeld_te_laat,
  count(tr.id) filter (where tr.status = 'aanwezig' and tr.op_tijd is false) as te_laat_gekomen
from public.spelers sp
left join public.training_registraties tr on tr.speler_id = sp.id
group by sp.id, sp.naam;

create or replace view public.v_training_opkomst_maand
with (security_invoker = on) as
select
  tr.speler_id,
  to_char(t.datum, 'YYYY-MM')                                        as maand,
  count(*) filter (where tr.status is not null)                      as geregistreerd,
  count(*) filter (where tr.status = 'aanwezig')                     as aanwezig,
  round(100.0 * count(*) filter (where tr.status = 'aanwezig')
        / nullif(count(*) filter (where tr.status is not null), 0))  as opkomst_pct
from public.training_registraties tr
join public.trainingen t on t.id = tr.training_id
where tr.status is not null
group by tr.speler_id, to_char(t.datum, 'YYYY-MM');

notify pgrst, 'reload schema';
