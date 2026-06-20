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
