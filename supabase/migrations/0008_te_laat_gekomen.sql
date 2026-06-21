-- ============================================================================
-- Treenio — migratie 0008: 'te laat gekomen' tellen bij trainingsopkomst
-- ----------------------------------------------------------------------------
-- Voegt te_laat_gekomen toe aan v_training_opkomst: aantal trainingen waar de
-- speler wél aanwezig was maar te laat kwam (op_tijd = false).
-- ============================================================================

create or replace view public.v_training_opkomst
with (security_invoker = on) as
select
  sp.id                                   as speler_id,
  sp.naam                                 as speler_naam,
  count(tr.id)                            as geregistreerd,
  count(tr.id) filter (where tr.aanwezig) as aanwezig,
  round(
    100.0 * count(tr.id) filter (where tr.aanwezig)
      / nullif(count(tr.id), 0)
  , 0)                                    as opkomst_pct,
  round(avg(tr.inzet) filter (where tr.inzet is not null), 1) as gem_inzet,
  count(tr.id) filter (where tr.afmeld_status = 'op_tijd')      as afgemeld_op_tijd,
  count(tr.id) filter (where tr.afmeld_status in ('te_laat', 'niet_afgemeld'))
                                          as afgemeld_te_laat,
  count(tr.id) filter (where tr.aanwezig and tr.op_tijd is false)
                                          as te_laat_gekomen
from public.spelers sp
left join public.training_registraties tr on tr.speler_id = sp.id
group by sp.id, sp.naam;

notify pgrst, 'reload schema';
