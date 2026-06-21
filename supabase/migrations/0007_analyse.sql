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
