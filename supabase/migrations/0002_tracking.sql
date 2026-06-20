-- ============================================================================
-- Treenio — migratie 0002: staf-registratielaag (trainingen + wedstrijden)
--                          + publieke seizoens-awards
-- ----------------------------------------------------------------------------
-- Ontwerpkeuze (bevestigd):
--   * ALLE RUWE REGISTRATIE is STAF-ONLY (Laag 3-scope). Spelers zien hun
--     rauwe cijfers NIET — niet die van zichzelf, niet die van teamgenoten.
--     Reden: speelminuten, "hoe vaak eruit gewisseld", "90 min bank" en de
--     afmeld-discipline kunnen pijn doen → dat is precies Laag 3.
--   * Naar Laag 1 (team-publiek) sijpelen alleen POSITIEF-SOM afgeleiden:
--       - badges / records (bestaande tabellen) — bv. op-tijd-badge, streak
--       - seizoen_awards (nieuw, hieronder) — speler van het jaar, meeste
--         opkomst, meeste inzet, meest verbeterd, beste op-tijd-afmelder
--   * Afmeld-discipline: privé teller voor staf; publiek alleen de POSITIEVE
--     badge "beste op-tijd-afmelder". Geen publiek minpunt → geen afrekenboard.
--
-- Conventies (zelfde als 0001):
--   * RLS staat vanaf het begin AAN.
--   * Elke schrijfbare tabel krijgt een expliciete UPDATE-policy.
--   * Eindigt met NOTIFY pgrst, 'reload schema';
-- ============================================================================

-- ============================================================================
-- STAF-ONLY: TRAININGEN
-- ============================================================================

create table if not exists public.trainingen (
  id           uuid primary key default gen_random_uuid(),
  datum        date not null,
  type         text,                 -- bv. 'veldtraining', 'keeperstraining'
  omschrijving text,
  created_at   timestamptz not null default now()
);

-- Eén rij per speler per training. Aanwezigheid, op-tijd, afmeld-discipline,
-- en de subjectieve inzet-rating van de coach. Alles staf-only.
create table if not exists public.training_registraties (
  id            uuid primary key default gen_random_uuid(),
  training_id   uuid not null references public.trainingen (id) on delete cascade,
  speler_id     uuid not null references public.spelers (id) on delete cascade,

  aanwezig      boolean not null default false,
  op_tijd       boolean,             -- op tijd op de training gekomen?

  -- Afmeld-discipline. 'op_tijd' = >=24u vooraf, 'kort_dag' = 12-24u vooraf,
  -- 'te_laat' = <12u vooraf, 'niet_afgemeld' = no-show zonder bericht,
  -- 'nvt' = was gewoon aanwezig.
  afmeld_status text not null default 'nvt'
                  check (afmeld_status in
                    ('op_tijd', 'kort_dag', 'te_laat', 'niet_afgemeld', 'nvt')),
  afgemeld_op   timestamptz,

  -- Subjectieve coach-inschatting van de inzet (1-5). STAF-ONLY.
  inzet         smallint check (inzet between 1 and 5),

  opmerking     text,
  created_at    timestamptz not null default now(),

  unique (training_id, speler_id)
);

-- ============================================================================
-- STAF-ONLY: WEDSTRIJD-REGISTRATIE (per speler)
-- ----------------------------------------------------------------------------
-- De 'wedstrijden'-tabel uit 0001 blijft team-publiek (datum/tegenstander/
-- uitslag). De gevoelige per-speler-cijfers komen HIER, staf-only.
-- Bedoeld om snel met het iPad-tiksysteem te vullen.
-- ============================================================================

create table if not exists public.wedstrijd_registraties (
  id            uuid primary key default gen_random_uuid(),
  wedstrijd_id  uuid not null references public.wedstrijden (id) on delete cascade,
  speler_id     uuid not null references public.spelers (id) on delete cascade,

  -- Aanwezigheid / discipline rond de wedstrijd
  op_tijd       boolean,
  afmeld_status text not null default 'nvt'
                  check (afmeld_status in
                    ('op_tijd', 'kort_dag', 'te_laat', 'niet_afgemeld', 'nvt')),

  -- Inzet / speeltijd
  startte_als         text not null default 'niet_in_selectie'
                        check (startte_als in
                          ('basis', 'wissel', 'niet_in_selectie')),
  speelminuten        int not null default 0 check (speelminuten between 0 and 130),
  gewisseld_uit       boolean not null default false,  -- eruit gehaald
  ingevallen          boolean not null default false,  -- mocht invallen
  volledige_bank      boolean not null default false,  -- 90 min bank

  -- Productie / tucht (iPad-tik)
  goals               int not null default 0 check (goals >= 0),
  assists             int not null default 0 check (assists >= 0),
  gele_kaarten        smallint not null default 0 check (gele_kaarten between 0 and 2),
  rode_kaart          boolean not null default false,
  overtredingen_gemaakt int not null default 0 check (overtredingen_gemaakt >= 0),
  overtredingen_tegen   int not null default 0 check (overtredingen_tegen >= 0),

  opmerking     text,
  created_at    timestamptz not null default now(),

  unique (wedstrijd_id, speler_id)
);

-- ============================================================================
-- STAF-ONLY: WEDSTRIJD-TEAMSTATS (per wedstrijd, niet per speler)
-- ----------------------------------------------------------------------------
-- Team-brede tellers die niet aan één speler hangen: standaardsituaties tegen,
-- en de verdeling spel vs. standaard van goals voor/tegen.
-- ============================================================================

create table if not exists public.wedstrijd_team_stats (
  id            uuid primary key default gen_random_uuid(),
  wedstrijd_id  uuid not null unique references public.wedstrijden (id) on delete cascade,

  vrije_trappen_tegen        int not null default 0 check (vrije_trappen_tegen >= 0),
  corners_tegen              int not null default 0 check (corners_tegen >= 0),

  goals_uit_spel             int not null default 0 check (goals_uit_spel >= 0),
  goals_uit_standaard        int not null default 0 check (goals_uit_standaard >= 0),
  tegengoals_uit_spel        int not null default 0 check (tegengoals_uit_spel >= 0),
  tegengoals_uit_standaard   int not null default 0 check (tegengoals_uit_standaard >= 0),

  created_at    timestamptz not null default now()
);

-- ============================================================================
-- LAAG 1 (team-publiek): SEIZOENS-AWARDS
-- ----------------------------------------------------------------------------
-- De positief-som eindejaarsprijzen. Staf kent ze toe; het hele team mag ze
-- zien (je wórdt er groter van, niemand kleiner). Speler-van-het-jaar,
-- meeste opkomst, meeste inzet, meest verbeterd, beste op-tijd-afmelder, ...
-- ============================================================================

create table if not exists public.seizoen_awards (
  id           uuid primary key default gen_random_uuid(),
  seizoen      text not null,            -- bv. '2025/2026'
  categorie    text not null,            -- bv. 'speler_van_het_jaar'
  speler_id    uuid not null references public.spelers (id) on delete cascade,
  toelichting  text,
  toegekend_op date not null default current_date,
  created_at   timestamptz not null default now()
);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.trainingen             enable row level security;
alter table public.training_registraties  enable row level security;
alter table public.wedstrijd_registraties enable row level security;
alter table public.wedstrijd_team_stats   enable row level security;
alter table public.seizoen_awards         enable row level security;

-- ----------------------------------------------------------------------------
-- STAF-ONLY tabellen: alle vier de commando's uitsluitend voor staf.
-- (Helper is_staf() komt uit 0001.)
-- ----------------------------------------------------------------------------

-- trainingen
create policy "trainingen_select_staf"
  on public.trainingen for select to authenticated using (public.is_staf());
create policy "trainingen_insert_staf"
  on public.trainingen for insert to authenticated with check (public.is_staf());
create policy "trainingen_update_staf"
  on public.trainingen for update to authenticated
  using (public.is_staf()) with check (public.is_staf());
create policy "trainingen_delete_staf"
  on public.trainingen for delete to authenticated using (public.is_staf());

-- training_registraties
create policy "training_reg_select_staf"
  on public.training_registraties for select to authenticated using (public.is_staf());
create policy "training_reg_insert_staf"
  on public.training_registraties for insert to authenticated with check (public.is_staf());
create policy "training_reg_update_staf"
  on public.training_registraties for update to authenticated
  using (public.is_staf()) with check (public.is_staf());
create policy "training_reg_delete_staf"
  on public.training_registraties for delete to authenticated using (public.is_staf());

-- wedstrijd_registraties
create policy "wedstrijd_reg_select_staf"
  on public.wedstrijd_registraties for select to authenticated using (public.is_staf());
create policy "wedstrijd_reg_insert_staf"
  on public.wedstrijd_registraties for insert to authenticated with check (public.is_staf());
create policy "wedstrijd_reg_update_staf"
  on public.wedstrijd_registraties for update to authenticated
  using (public.is_staf()) with check (public.is_staf());
create policy "wedstrijd_reg_delete_staf"
  on public.wedstrijd_registraties for delete to authenticated using (public.is_staf());

-- wedstrijd_team_stats
create policy "wedstrijd_team_select_staf"
  on public.wedstrijd_team_stats for select to authenticated using (public.is_staf());
create policy "wedstrijd_team_insert_staf"
  on public.wedstrijd_team_stats for insert to authenticated with check (public.is_staf());
create policy "wedstrijd_team_update_staf"
  on public.wedstrijd_team_stats for update to authenticated
  using (public.is_staf()) with check (public.is_staf());
create policy "wedstrijd_team_delete_staf"
  on public.wedstrijd_team_stats for delete to authenticated using (public.is_staf());

-- ----------------------------------------------------------------------------
-- LAAG 1: seizoen_awards — team leest, staf beheert.
-- ----------------------------------------------------------------------------
create policy "awards_select_team"
  on public.seizoen_awards for select to authenticated using (true);
create policy "awards_insert_staf"
  on public.seizoen_awards for insert to authenticated with check (public.is_staf());
create policy "awards_update_staf"
  on public.seizoen_awards for update to authenticated
  using (public.is_staf()) with check (public.is_staf());
create policy "awards_delete_staf"
  on public.seizoen_awards for delete to authenticated using (public.is_staf());

-- ============================================================================
-- STAF-AGGREGATIE-VIEWS
-- ----------------------------------------------------------------------------
-- security_invoker = on  → de view draait met de rechten van de aanroeper,
-- dus de staf-only RLS van de onderliggende tabellen blijft gelden. Een speler
-- die deze view bevraagt krijgt 0 rijen. Dit zijn puur staf-hulpoverzichten.
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
                                          as afgemeld_te_laat
from public.spelers sp
left join public.training_registraties tr on tr.speler_id = sp.id
group by sp.id, sp.naam;

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
  coalesce(sum(wr.overtredingen_tegen), 0)               as overtredingen_tegen
from public.spelers sp
left join public.wedstrijd_registraties wr on wr.speler_id = sp.id
group by sp.id, sp.naam;

-- ============================================================================
notify pgrst, 'reload schema';
