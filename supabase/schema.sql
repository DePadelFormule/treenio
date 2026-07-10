-- ============================================================================
-- Treenio — VOLLEDIG schema in één bestand (migraties 0001 t/m 0013 op volgorde)
-- ----------------------------------------------------------------------------
-- Plak dit in de Supabase SQL editor en klik Run. Daarna supabase/seed.sql voor
-- de selectie van Nivo Sparta JO17-2. Zie DEPLOY.md voor de volledige stappen.
-- ============================================================================

-- ============================================================
-- supabase/migrations/0001_init.sql
-- ============================================================
-- ============================================================================
-- Treenio — initiële schema + RLS-policies
-- ----------------------------------------------------------------------------
-- Kernidee: DRIE ZICHTBAARHEIDSLAGEN, fysiek gescheiden in aparte tabellen.
--   Laag 1 (team-publiek)   : leesbaar voor het hele team.
--   Laag 2 (speler + coach) : staf + uitsluitend de betreffende speler.
--   Laag 3 (staf-only)      : uitsluitend staf. Nooit zichtbaar voor spelers.
--
-- BEWUSTE KEUZE: geen enkele tabel met een `is_zichtbaar`-vlaggetje.
-- Een verkeerd gezet vlaggetje lekt Laag 3. Daarom scheiden we fysiek + RLS.
--
-- Conventies:
--   * RLS staat vanaf het begin AAN op elke tabel.
--   * Elke tabel met schrijfbehoefte krijgt expliciet een UPDATE-policy
--     (anders krijg je stille 0-row failures).
--   * Na het toevoegen van kolommen later: NOTIFY pgrst, 'reload schema';
-- ============================================================================

-- Voor gen_random_uuid()
create extension if not exists "pgcrypto";

-- ============================================================================
-- BASISTABELLEN
-- ============================================================================

-- Spelers. auth_user_id koppelt aan Supabase Auth (auth.users).
create table if not exists public.spelers (
  id                uuid primary key default gen_random_uuid(),
  auth_user_id      uuid unique references auth.users (id) on delete set null,
  naam              text not null,
  rugnummer         int,
  positie_voorkeur  text,
  foto_url          text,
  geboortedatum     date,
  created_at        timestamptz not null default now()
);

-- Staf (hoofdtrainer / assistent). auth_user_id koppelt aan Supabase Auth.
create table if not exists public.staf (
  id            uuid primary key default gen_random_uuid(),
  auth_user_id  uuid unique references auth.users (id) on delete set null,
  naam          text not null,
  rol           text not null default 'assistent'
                  check (rol in ('hoofdtrainer', 'assistent')),
  created_at    timestamptz not null default now()
);

-- ============================================================================
-- HELPER-FUNCTIES (SECURITY DEFINER om RLS-recursie te vermijden)
-- ----------------------------------------------------------------------------
-- We gebruiken deze in policies. Ze draaien als owner, dus ze triggeren niet
-- opnieuw de RLS van de tabellen die ze raadplegen.
-- ============================================================================

-- Is de ingelogde gebruiker staf?
create or replace function public.is_staf()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.staf s
    where s.auth_user_id = auth.uid()
  );
$$;

-- De speler-id van de ingelogde gebruiker (NULL als hij geen speler is).
create or replace function public.current_speler_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select sp.id from public.spelers sp
  where sp.auth_user_id = auth.uid()
  limit 1;
$$;

-- ============================================================================
-- LAAG 1 — TEAM-PUBLIEK
-- Leesbaar voor iedereen die is ingelogd (speler of staf). Schrijven: staf.
-- Bewust positief-som: badges, records, mvp-stemmen, challenges.
-- ============================================================================

create table if not exists public.wedstrijden (
  id           uuid primary key default gen_random_uuid(),
  datum        date not null,
  tegenstander text not null,
  uitslag      text,
  created_at   timestamptz not null default now()
);

create table if not exists public.badges (
  id          uuid primary key default gen_random_uuid(),
  speler_id   uuid not null references public.spelers (id) on delete cascade,
  type        text not null,
  behaald_op  date not null default current_date,
  created_at  timestamptz not null default now()
);

create table if not exists public.records (
  id          uuid primary key default gen_random_uuid(),
  speler_id   uuid not null references public.spelers (id) on delete cascade,
  soort       text not null,
  waarde      numeric not null,
  behaald_op  date not null default current_date,
  created_at  timestamptz not null default now()
);

create table if not exists public.mvp_stemmen (
  id                    uuid primary key default gen_random_uuid(),
  wedstrijd_id          uuid not null references public.wedstrijden (id) on delete cascade,
  stemmer_speler_id     uuid not null references public.spelers (id) on delete cascade,
  gestemd_op_speler_id  uuid not null references public.spelers (id) on delete cascade,
  gestemd_op            timestamptz not null default now(),
  -- één stem per speler per wedstrijd
  unique (wedstrijd_id, stemmer_speler_id)
);

create table if not exists public.challenges (
  id           uuid primary key default gen_random_uuid(),
  titel        text not null,
  omschrijving text,
  week         int,
  deadline     date,
  created_at   timestamptz not null default now()
);

create table if not exists public.challenge_uploads (
  id            uuid primary key default gen_random_uuid(),
  challenge_id  uuid not null references public.challenges (id) on delete cascade,
  speler_id     uuid not null references public.spelers (id) on delete cascade,
  video_url     text not null,
  ingeleverd_op timestamptz not null default now()
);

-- ============================================================================
-- LAAG 2 — SPELER + COACH
-- Ontwikkeldoelen, afgesproken mét de speler. Zichtbaar/bewerkbaar voor staf
-- én uitsluitend de betreffende speler. Geen cijfers/ratings.
-- ============================================================================

create table if not exists public.ontwikkeldoelen (
  id             uuid primary key default gen_random_uuid(),
  speler_id      uuid not null references public.spelers (id) on delete cascade,
  doel           text not null,
  status         text not null default 'open'
                   check (status in ('open', 'bezig', 'behaald', 'gepauzeerd')),
  afgesproken_op date not null default current_date,
  coach_id       uuid references public.staf (id) on delete set null,
  created_at     timestamptz not null default now()
);

-- ============================================================================
-- LAAG 3 — STAF-ONLY
-- De eerlijke inschatting. NOOIT zichtbaar voor de speler.
-- ============================================================================

create table if not exists public.staf_notities (
  id                  uuid primary key default gen_random_uuid(),
  speler_id           uuid not null references public.spelers (id) on delete cascade,
  inschatting         text,
  verwachting         text,
  positie_inschatting text,
  coach_id            uuid references public.staf (id) on delete set null,
  created_at          timestamptz not null default now()
);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.spelers            enable row level security;
alter table public.staf               enable row level security;
alter table public.wedstrijden        enable row level security;
alter table public.badges             enable row level security;
alter table public.records            enable row level security;
alter table public.mvp_stemmen        enable row level security;
alter table public.challenges         enable row level security;
alter table public.challenge_uploads  enable row level security;
alter table public.ontwikkeldoelen    enable row level security;
alter table public.staf_notities      enable row level security;

-- ----------------------------------------------------------------------------
-- BASIS: spelers
-- Iedereen ingelogd mag basis-spelerprofielen lezen (nodig voor team-publiek
-- kaartjes / mvp-stemming). Schrijven: staf. Een speler mag zijn eigen
-- profiel (bv. foto) updaten.
-- ----------------------------------------------------------------------------
create policy "spelers_select_ingelogd"
  on public.spelers for select
  to authenticated
  using (true);

create policy "spelers_insert_staf"
  on public.spelers for insert
  to authenticated
  with check (public.is_staf());

create policy "spelers_update_staf_of_eigen"
  on public.spelers for update
  to authenticated
  using (public.is_staf() or auth_user_id = auth.uid())
  with check (public.is_staf() or auth_user_id = auth.uid());

create policy "spelers_delete_staf"
  on public.spelers for delete
  to authenticated
  using (public.is_staf());

-- ----------------------------------------------------------------------------
-- BASIS: staf
-- Iedereen ingelogd mag zien wie de staf is (naam/rol). Beheer: staf.
-- ----------------------------------------------------------------------------
create policy "staf_select_ingelogd"
  on public.staf for select
  to authenticated
  using (true);

create policy "staf_insert_staf"
  on public.staf for insert
  to authenticated
  with check (public.is_staf());

create policy "staf_update_staf"
  on public.staf for update
  to authenticated
  using (public.is_staf())
  with check (public.is_staf());

create policy "staf_delete_staf"
  on public.staf for delete
  to authenticated
  using (public.is_staf());

-- ----------------------------------------------------------------------------
-- LAAG 1 — leesbaar voor heel team (authenticated), schrijven door staf.
-- Uitzondering: mvp_stemmen + challenge_uploads schrijft de speler zelf.
-- ----------------------------------------------------------------------------

-- wedstrijden
create policy "wedstrijden_select_team"
  on public.wedstrijden for select to authenticated using (true);
create policy "wedstrijden_insert_staf"
  on public.wedstrijden for insert to authenticated with check (public.is_staf());
create policy "wedstrijden_update_staf"
  on public.wedstrijden for update to authenticated
  using (public.is_staf()) with check (public.is_staf());
create policy "wedstrijden_delete_staf"
  on public.wedstrijden for delete to authenticated using (public.is_staf());

-- badges
create policy "badges_select_team"
  on public.badges for select to authenticated using (true);
create policy "badges_insert_staf"
  on public.badges for insert to authenticated with check (public.is_staf());
create policy "badges_update_staf"
  on public.badges for update to authenticated
  using (public.is_staf()) with check (public.is_staf());
create policy "badges_delete_staf"
  on public.badges for delete to authenticated using (public.is_staf());

-- records
create policy "records_select_team"
  on public.records for select to authenticated using (true);
create policy "records_insert_staf"
  on public.records for insert to authenticated with check (public.is_staf());
create policy "records_update_staf"
  on public.records for update to authenticated
  using (public.is_staf()) with check (public.is_staf());
create policy "records_delete_staf"
  on public.records for delete to authenticated using (public.is_staf());

-- mvp_stemmen: team mag lezen; spelers stemmen zelf (één keer, als zichzelf).
create policy "mvp_select_team"
  on public.mvp_stemmen for select to authenticated using (true);
create policy "mvp_insert_eigen_stem"
  on public.mvp_stemmen for insert to authenticated
  with check (
    stemmer_speler_id = public.current_speler_id()
    -- niet op jezelf stemmen
    and gestemd_op_speler_id <> public.current_speler_id()
  );
create policy "mvp_delete_eigen_of_staf"
  on public.mvp_stemmen for delete to authenticated
  using (stemmer_speler_id = public.current_speler_id() or public.is_staf());

-- challenges: team leest, staf beheert.
create policy "challenges_select_team"
  on public.challenges for select to authenticated using (true);
create policy "challenges_insert_staf"
  on public.challenges for insert to authenticated with check (public.is_staf());
create policy "challenges_update_staf"
  on public.challenges for update to authenticated
  using (public.is_staf()) with check (public.is_staf());
create policy "challenges_delete_staf"
  on public.challenges for delete to authenticated using (public.is_staf());

-- challenge_uploads: team leest; speler levert zijn eigen upload in.
create policy "uploads_select_team"
  on public.challenge_uploads for select to authenticated using (true);
create policy "uploads_insert_eigen"
  on public.challenge_uploads for insert to authenticated
  with check (speler_id = public.current_speler_id());
create policy "uploads_update_eigen_of_staf"
  on public.challenge_uploads for update to authenticated
  using (speler_id = public.current_speler_id() or public.is_staf())
  with check (speler_id = public.current_speler_id() or public.is_staf());
create policy "uploads_delete_eigen_of_staf"
  on public.challenge_uploads for delete to authenticated
  using (speler_id = public.current_speler_id() or public.is_staf());

-- ----------------------------------------------------------------------------
-- LAAG 2 — ontwikkeldoelen
-- Lezen: staf OF de betreffende speler. Schrijven/beheren: staf.
-- (De speler ziet zijn doelen, de staf beheert ze. Statusupdate door speler
--  kun je later toevoegen met een gerichtere policy.)
-- ----------------------------------------------------------------------------
create policy "doelen_select_staf_of_eigen"
  on public.ontwikkeldoelen for select to authenticated
  using (public.is_staf() or speler_id = public.current_speler_id());

create policy "doelen_insert_staf"
  on public.ontwikkeldoelen for insert to authenticated
  with check (public.is_staf());

create policy "doelen_update_staf"
  on public.ontwikkeldoelen for update to authenticated
  using (public.is_staf()) with check (public.is_staf());

create policy "doelen_delete_staf"
  on public.ontwikkeldoelen for delete to authenticated
  using (public.is_staf());

-- ----------------------------------------------------------------------------
-- LAAG 3 — staf_notities
-- ALLES uitsluitend staf. Geen enkele policy geeft spelers toegang.
-- Dit is de fysieke garantie dat Laag 3 nooit lekt.
-- ----------------------------------------------------------------------------
create policy "notities_select_staf"
  on public.staf_notities for select to authenticated
  using (public.is_staf());

create policy "notities_insert_staf"
  on public.staf_notities for insert to authenticated
  with check (public.is_staf());

create policy "notities_update_staf"
  on public.staf_notities for update to authenticated
  using (public.is_staf()) with check (public.is_staf());

create policy "notities_delete_staf"
  on public.staf_notities for delete to authenticated
  using (public.is_staf());

-- ============================================================================
-- PostgREST schema-cache verversen (verplicht na DDL-wijzigingen)
-- ============================================================================
notify pgrst, 'reload schema';


-- ============================================================
-- supabase/migrations/0002_tracking.sql
-- ============================================================
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


-- ============================================================
-- supabase/migrations/0003_balverlies_keeper.sql
-- ============================================================
-- ============================================================================
-- Treenio — migratie 0003: balverlies + keeper-set
-- ----------------------------------------------------------------------------
-- Zelfde ontwerpregel: ruwe registratie is STAF-ONLY (Laag 3-scope).
--   * balverlies → per-speler veld op wedstrijd_registraties.
--   * keeper-set → aparte tabel keeper_registraties (keeperspecifiek; geen
--     lege keeper-kolommen bij elke veldspeler).
--
-- 'clean_sheet' houden we hier ruw/staf-only voor consistentie, maar het is
-- bij uitstek geschikt om later als POSITIEVE Laag 1-badge ("X clean sheets")
-- naar het team te tillen.
-- ============================================================================

-- ---- Balverlies op de bestaande per-speler wedstrijdregistratie -------------
alter table public.wedstrijd_registraties
  add column if not exists balverlies int not null default 0
    check (balverlies >= 0);

-- ============================================================================
-- STAF-ONLY: KEEPER-REGISTRATIE (per keeper per wedstrijd)
-- ============================================================================
create table if not exists public.keeper_registraties (
  id                   uuid primary key default gen_random_uuid(),
  wedstrijd_id         uuid not null references public.wedstrijden (id) on delete cascade,
  speler_id            uuid not null references public.spelers (id) on delete cascade,

  hoge_ballen_gepakt   int not null default 0 check (hoge_ballen_gepakt >= 0),
  reddingen            int not null default 0 check (reddingen >= 0),
  een_op_een_reddingen int not null default 0 check (een_op_een_reddingen >= 0),
  reddingen_buiten_16  int not null default 0 check (reddingen_buiten_16 >= 0),
  tegengoals           int not null default 0 check (tegengoals >= 0),
  clean_sheet          boolean not null default false,

  -- Distributie: hoe vaak koos de keeper voor lang uittrappen vs. opbouw
  -- van achteruit (korte opbouw). Tellers per wedstrijd.
  uittrappen_lang      int not null default 0 check (uittrappen_lang >= 0),
  opbouw_van_achteruit int not null default 0 check (opbouw_van_achteruit >= 0),

  opmerking            text,
  created_at           timestamptz not null default now(),

  unique (wedstrijd_id, speler_id)
);

alter table public.keeper_registraties enable row level security;

-- Staf-only: alle vier de commando's (incl. expliciete UPDATE-policy).
create policy "keeper_reg_select_staf"
  on public.keeper_registraties for select to authenticated using (public.is_staf());
create policy "keeper_reg_insert_staf"
  on public.keeper_registraties for insert to authenticated with check (public.is_staf());
create policy "keeper_reg_update_staf"
  on public.keeper_registraties for update to authenticated
  using (public.is_staf()) with check (public.is_staf());
create policy "keeper_reg_delete_staf"
  on public.keeper_registraties for delete to authenticated using (public.is_staf());

-- ============================================================================
-- VIEWS bijwerken / toevoegen
-- ============================================================================

-- v_wedstrijd_totalen: balverlies-som erbij (achteraan toegevoegd → veilig
-- voor create or replace).
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
  coalesce(sum(wr.balverlies), 0)                        as balverlies
from public.spelers sp
left join public.wedstrijd_registraties wr on wr.speler_id = sp.id
group by sp.id, sp.naam;

-- v_keeper_totalen: seizoenstotalen per keeper (staf-only via security_invoker).
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
join public.keeper_registraties kr on kr.speler_id = sp.id
group by sp.id, sp.naam;

-- ============================================================================
notify pgrst, 'reload schema';


-- ============================================================
-- supabase/migrations/0004_positie_per_wedstrijd.sql
-- ============================================================
-- ============================================================================
-- Treenio — migratie 0004: gespeelde positie per wedstrijd
-- ----------------------------------------------------------------------------
-- Jeugd speelt vaak op wisselende posities. We leggen de FEITELIJK gespeelde
-- positie per wedstrijd vast op de per-speler registratie (staf-only,
-- Laag 3-scope).
--
-- Niet te verwarren met:
--   * spelers.positie_voorkeur  → voorkeur op het profiel (team-publiek)
--   * staf_notities.positie_inschatting → OORDEEL van de staf (Laag 3)
-- Dit veld is puur registratie: waar stond hij die wedstrijd.
--
-- Vrij tekstveld zodat de jeugdvariatie past (codes als 'ST', 'RV', 'CV',
-- 'CVM', 'LB', 'K', ...). Een vaste keuzelijst zetten we later in de UI zodat
-- de groepering schoon blijft.
-- ============================================================================

alter table public.wedstrijd_registraties
  add column if not exists positie text;

-- Overzicht: hoe vaak speelde een speler op welke positie?
create or replace view public.v_speler_posities
with (security_invoker = on) as
select
  wr.speler_id,
  wr.positie,
  count(*) as aantal
from public.wedstrijd_registraties wr
where wr.positie is not null
  and wr.startte_als <> 'niet_in_selectie'
group by wr.speler_id, wr.positie;

notify pgrst, 'reload schema';


-- ============================================================
-- supabase/migrations/0005_staf_only.sql
-- ============================================================
-- ============================================================================
-- Treenio — migratie 0005: spelerskant verwijderen, app wordt 100% staf-only
-- ----------------------------------------------------------------------------
-- Besluit: het hele speler-/team-publieke deel gaat eruit. Spelers loggen niet
-- meer in; ze zijn voortaan puur gegevens die de staf beheert. Alles wat
-- overblijft is uitsluitend zichtbaar voor de trainersstaf.
--
-- 1) Laag 1 (team-publiek) tabellen worden gedropt.
-- 2) ontwikkeldoelen (oude Laag 2) blijft, maar wordt staf-only.
-- 3) spelers / staf / wedstrijden: select wordt staf-only (was team).
-- 4) Helper current_speler_id() is niet meer nodig en wordt verwijderd.
-- ============================================================================

-- 1) Laag 1 weg (cascade ruimt bijbehorende policies/contraints op).
drop table if exists public.challenge_uploads cascade;
drop table if exists public.challenges        cascade;
drop table if exists public.mvp_stemmen       cascade;
drop table if exists public.records           cascade;
drop table if exists public.badges            cascade;
drop table if exists public.seizoen_awards    cascade;

-- 2) ontwikkeldoelen → staf-only lezen (speler kon dit eerst zien).
drop policy if exists "doelen_select_staf_of_eigen" on public.ontwikkeldoelen;
create policy "doelen_select_staf"
  on public.ontwikkeldoelen for select to authenticated
  using (public.is_staf());

-- 3a) spelers → staf-only (was: team-select + eigen-update).
drop policy if exists "spelers_select_ingelogd"        on public.spelers;
drop policy if exists "spelers_update_staf_of_eigen"   on public.spelers;
create policy "spelers_select_staf"
  on public.spelers for select to authenticated
  using (public.is_staf());
create policy "spelers_update_staf"
  on public.spelers for update to authenticated
  using (public.is_staf()) with check (public.is_staf());

-- 3b) staf → staf-only select (was team).
drop policy if exists "staf_select_ingelogd" on public.staf;
create policy "staf_select_staf"
  on public.staf for select to authenticated
  using (public.is_staf());

-- 3c) wedstrijden → staf-only select (was team).
drop policy if exists "wedstrijden_select_team" on public.wedstrijden;
create policy "wedstrijden_select_staf"
  on public.wedstrijden for select to authenticated
  using (public.is_staf());

-- 4) Ongebruikte helper verwijderen (geen policy verwijst er nog naar).
drop function if exists public.current_speler_id();

notify pgrst, 'reload schema';


-- ============================================================
-- supabase/migrations/0006_wedstrijd_bron_id.sql
-- ============================================================
-- ============================================================================
-- Treenio — migratie 0006: externe bron-id op wedstrijden
-- ----------------------------------------------------------------------------
-- Voor het importeren van het wedstrijdprogramma uit de KNVB Dataservice
-- (voetbal.nl / Sportlink). We bewaren de KNVB-wedstrijdcode in bron_id, met
-- een unieke index, zodat herhaald synchroniseren bestaande wedstrijden
-- bijwerkt i.p.v. dubbele rijen aanmaakt (upsert op bron_id).
--
-- Handmatig toegevoegde wedstrijden houden bron_id = NULL; een unieke index
-- met NULLs toegestaan (meerdere NULLs mogen) is precies wat we willen.
-- ============================================================================

alter table public.wedstrijden
  add column if not exists bron_id text;

create unique index if not exists wedstrijden_bron_id_key
  on public.wedstrijden (bron_id)
  where bron_id is not null;

notify pgrst, 'reload schema';


-- ============================================================
-- supabase/migrations/0007_analyse.sql
-- ============================================================
-- ============================================================================
-- Treenio — migratie 0007: posities, aandachtspunten, extra wedstrijdstats,
--                          Man of the Match en tegenstander-scouting
-- ----------------------------------------------------------------------------
-- Alles staf-only (zie 0005). Breidt de analyse-kant uit.
-- ============================================================================

-- 1) Spelers: hoofdpositie + 2 alternatieve posities.
alter table public.spelers
  add column if not exists hoofdpositie  text,
  add column if not exists alt_positie_1 text,
  add column if not exists alt_positie_2 text;

-- 2) Per-speler wedstrijdstats: Man of the Match, balcontacten vóór assist,
--    duels gewonnen/verloren. (balverlies bestaat al sinds 0003.)
alter table public.wedstrijd_registraties
  add column if not exists man_of_the_match        boolean not null default false,
  add column if not exists balcontacten_voor_assist int    not null default 0
    check (balcontacten_voor_assist >= 0),
  add column if not exists duels_gewonnen           int    not null default 0
    check (duels_gewonnen >= 0),
  add column if not exists duels_verloren           int    not null default 0
    check (duels_verloren >= 0);

-- 3) Aandachtspunten per speler (los, kort; meerdere per speler mogelijk).
create table if not exists public.aandachtspunten (
  id          uuid primary key default gen_random_uuid(),
  speler_id   uuid not null references public.spelers (id) on delete cascade,
  tekst       text not null,
  opgelost    boolean not null default false,
  coach_id    uuid references public.staf (id) on delete set null,
  created_at  timestamptz not null default now()
);

alter table public.aandachtspunten enable row level security;
create policy "aandacht_select_staf"
  on public.aandachtspunten for select to authenticated using (public.is_staf());
create policy "aandacht_insert_staf"
  on public.aandachtspunten for insert to authenticated with check (public.is_staf());
create policy "aandacht_update_staf"
  on public.aandachtspunten for update to authenticated
  using (public.is_staf()) with check (public.is_staf());
create policy "aandacht_delete_staf"
  on public.aandachtspunten for delete to authenticated using (public.is_staf());

-- 4) Tegenstander-scouting per wedstrijd (1 rij per wedstrijd).
create table if not exists public.wedstrijd_scouting (
  id                      uuid primary key default gen_random_uuid(),
  wedstrijd_id            uuid not null unique references public.wedstrijden (id) on delete cascade,
  systeem_tegenstander    text,   -- bv. '4-3-3', '4-4-2'
  drukzetten              text    -- hoe speelt de tegenstander zonder bal
                            check (drukzetten in ('hoog', 'inzakken', 'wisselend')),
  zwakke_schakel          text,   -- zwakke schakel in hun opbouw
  uitblinkers             text,   -- gevaarlijke spelers tegenstander
  eigen_opmerking         text,   -- vrije notitie over ons eigen plan
  created_at              timestamptz not null default now()
);

alter table public.wedstrijd_scouting enable row level security;
create policy "scouting_select_staf"
  on public.wedstrijd_scouting for select to authenticated using (public.is_staf());
create policy "scouting_insert_staf"
  on public.wedstrijd_scouting for insert to authenticated with check (public.is_staf());
create policy "scouting_update_staf"
  on public.wedstrijd_scouting for update to authenticated
  using (public.is_staf()) with check (public.is_staf());
create policy "scouting_delete_staf"
  on public.wedstrijd_scouting for delete to authenticated using (public.is_staf());

-- 5) v_wedstrijd_totalen uitbreiden met de nieuwe tellers.
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
left join public.wedstrijd_registraties wr on wr.speler_id = sp.id
group by sp.id, sp.naam;

notify pgrst, 'reload schema';


-- ============================================================
-- supabase/migrations/0008_te_laat_gekomen.sql
-- ============================================================
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


-- ============================================================
-- supabase/migrations/0009_opstelling.sql
-- ============================================================
-- ============================================================================
-- Treenio — migratie 0009: opstelling / formatiebord per wedstrijd
-- ----------------------------------------------------------------------------
-- Eén opstelling per wedstrijd. veld = { slotKey: speler_id }, bank = [speler_id].
-- Alles staf-only.
-- ============================================================================

create table if not exists public.wedstrijd_opstelling (
  id            uuid primary key default gen_random_uuid(),
  wedstrijd_id  uuid not null unique references public.wedstrijden (id) on delete cascade,
  formatie      text not null default '4-3-3',
  veld          jsonb not null default '{}'::jsonb,
  bank          jsonb not null default '[]'::jsonb,
  created_at    timestamptz not null default now()
);

alter table public.wedstrijd_opstelling enable row level security;

create policy "opstelling_select_staf"
  on public.wedstrijd_opstelling for select to authenticated using (public.is_staf());
create policy "opstelling_insert_staf"
  on public.wedstrijd_opstelling for insert to authenticated with check (public.is_staf());
create policy "opstelling_update_staf"
  on public.wedstrijd_opstelling for update to authenticated
  using (public.is_staf()) with check (public.is_staf());
create policy "opstelling_delete_staf"
  on public.wedstrijd_opstelling for delete to authenticated using (public.is_staf());

notify pgrst, 'reload schema';


-- ============================================================
-- supabase/migrations/0010_beschikbaarheid_verslag.sql
-- ============================================================
-- ============================================================================
-- Treenio — migratie 0010: beschikbaarheid/blessures + wedstrijdverslag
-- ----------------------------------------------------------------------------
-- Punt 2: huidige fitheidsstatus per speler (fit/twijfel/geblesseerd) + notitie.
-- Punt 4: kort wedstrijdverslag achteraf per wedstrijd.
-- Alles staf-only.
-- ============================================================================

-- Punt 2 — status op de speler
alter table public.spelers
  add column if not exists beschikbaarheid text not null default 'fit'
    check (beschikbaarheid in ('fit', 'twijfel', 'geblesseerd')),
  add column if not exists blessure_notitie text;

-- Punt 4 — wedstrijdverslag (1 per wedstrijd)
create table if not exists public.wedstrijd_verslag (
  id            uuid primary key default gen_random_uuid(),
  wedstrijd_id  uuid not null unique references public.wedstrijden (id) on delete cascade,
  ging_goed     text,
  kan_beter     text,
  voor_training text,
  created_at    timestamptz not null default now()
);

alter table public.wedstrijd_verslag enable row level security;

create policy "verslag_select_staf"
  on public.wedstrijd_verslag for select to authenticated using (public.is_staf());
create policy "verslag_insert_staf"
  on public.wedstrijd_verslag for insert to authenticated with check (public.is_staf());
create policy "verslag_update_staf"
  on public.wedstrijd_verslag for update to authenticated
  using (public.is_staf()) with check (public.is_staf());
create policy "verslag_delete_staf"
  on public.wedstrijd_verslag for delete to authenticated using (public.is_staf());

notify pgrst, 'reload schema';


-- ============================================================
-- supabase/migrations/0011_spelsituaties.sql
-- ============================================================
-- ============================================================================
-- Treenio — migratie 0011: tactisch tekenbord / spelsituaties
-- ----------------------------------------------------------------------------
-- Eén rij per spelsituatie. data = { tokens:[...], frames:[{tokenId:{x,y}}] }.
-- Staf-only.
-- ============================================================================

create table if not exists public.spelsituaties (
  id          uuid primary key default gen_random_uuid(),
  titel       text not null,
  uitleg      text,
  half_veld   boolean not null default false,
  data        jsonb not null default '{"tokens":[],"frames":[{}]}'::jsonb,
  created_at  timestamptz not null default now()
);

alter table public.spelsituaties enable row level security;

create policy "spelsituaties_select_staf"
  on public.spelsituaties for select to authenticated using (public.is_staf());
create policy "spelsituaties_insert_staf"
  on public.spelsituaties for insert to authenticated with check (public.is_staf());
create policy "spelsituaties_update_staf"
  on public.spelsituaties for update to authenticated
  using (public.is_staf()) with check (public.is_staf());
create policy "spelsituaties_delete_staf"
  on public.spelsituaties for delete to authenticated using (public.is_staf());

notify pgrst, 'reload schema';


-- ============================================================
-- supabase/migrations/0012_presentie_status.sql
-- ============================================================
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


-- ============================================================
-- supabase/migrations/0013_vakantie.sql
-- ============================================================
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

