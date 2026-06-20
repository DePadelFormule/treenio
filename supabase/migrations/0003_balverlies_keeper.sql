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
