-- ============================================================================
-- Treenio — migratie 0022: wedstrijdtype (competitie / beker / vriendschappelijk)
-- ----------------------------------------------------------------------------
-- Elke wedstrijd krijgt een type. Vriendschappelijke wedstrijden tellen NIET
-- mee in de seizoensstatistieken (spelerskaarten, team-overzicht, posities,
-- keeperstats). Bestaande wedstrijden worden 'competitie'.
-- Draai dit in de SQL editor van het Supabase-dashboard.
-- ============================================================================

alter table public.wedstrijden
  add column if not exists type text not null default 'competitie'
    check (type in ('competitie', 'beker', 'vriendschappelijk'));

-- v_wedstrijd_totalen: vriendschappelijke wedstrijden niet meetellen.
create or replace view public.v_wedstrijd_totalen
with (security_invoker = on) as
select
  sp.id                                          as speler_id,
  sp.naam                                        as speler_naam,
  count(wr.id) filter (where wr.startte_als <> 'niet_in_selectie') as in_selectie,
  count(wr.id) filter (where wr.startte_als = 'basis')   as basisplaatsen,
  count(wr.id) filter (where wr.ingevallen)              as invalbeurten,
  count(wr.id) filter (where wr.gewisseld_uit)           as keer_uit_gewisseld,
  count(wr.id) filter (where wr.volledige_bank)          as keer_90_bank,
  coalesce(sum(wr.speelminuten), 0)                      as totaal_minuten,
  coalesce(sum(wr.goals), 0)                             as goals,
  coalesce(sum(wr.assists), 0)                           as assists,
  coalesce(sum(wr.gele_kaarten), 0)                      as gele_kaarten,
  count(wr.id) filter (where wr.rode_kaart)              as rode_kaarten,
  coalesce(sum(wr.overtredingen_gemaakt), 0)             as overtredingen_gemaakt,
  coalesce(sum(wr.overtredingen_tegen), 0)               as overtredingen_tegen,
  coalesce(sum(wr.balverlies), 0)                        as balverlies,
  count(wr.id) filter (where wr.man_of_the_match)        as man_of_the_match,
  coalesce(sum(wr.balcontacten_voor_assist), 0)          as balcontacten_voor_assist,
  coalesce(sum(wr.duels_gewonnen), 0)                    as duels_gewonnen,
  coalesce(sum(wr.duels_verloren), 0)                    as duels_verloren
from public.spelers sp
left join public.wedstrijd_registraties wr
  on wr.speler_id = sp.id
 and exists (
   select 1 from public.wedstrijden w
   where w.id = wr.wedstrijd_id and w.type <> 'vriendschappelijk'
 )
group by sp.id, sp.naam;

-- v_keeper_totalen: idem.
create or replace view public.v_keeper_totalen
with (security_invoker = on) as
select
  sp.id                                          as speler_id,
  sp.naam                                        as speler_naam,
  count(kr.id)                                   as wedstrijden_keep,
  count(kr.id) filter (where kr.clean_sheet)     as clean_sheets,
  coalesce(sum(kr.hoge_ballen_gepakt), 0)        as hoge_ballen_gepakt,
  coalesce(sum(kr.reddingen), 0)                 as reddingen,
  coalesce(sum(kr.een_op_een_reddingen), 0)      as een_op_een_reddingen,
  coalesce(sum(kr.reddingen_buiten_16), 0)       as reddingen_buiten_16,
  coalesce(sum(kr.tegengoals), 0)                as tegengoals,
  coalesce(sum(kr.uittrappen_lang), 0)           as uittrappen_lang,
  coalesce(sum(kr.opbouw_van_achteruit), 0)      as opbouw_van_achteruit
from public.spelers sp
join public.keeper_registraties kr
  on kr.speler_id = sp.id
 and exists (
   select 1 from public.wedstrijden w
   where w.id = kr.wedstrijd_id and w.type <> 'vriendschappelijk'
 )
group by sp.id, sp.naam;

-- v_speler_posities: idem.
create or replace view public.v_speler_posities
with (security_invoker = on) as
select
  wr.speler_id,
  wr.positie,
  count(*) as aantal
from public.wedstrijd_registraties wr
where wr.positie is not null
  and wr.startte_als <> 'niet_in_selectie'
  and exists (
    select 1 from public.wedstrijden w
    where w.id = wr.wedstrijd_id and w.type <> 'vriendschappelijk'
  )
group by wr.speler_id, wr.positie;

notify pgrst, 'reload schema';
