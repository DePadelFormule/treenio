-- ============================================================================
-- Treenio — migratie 0026: Academy (handboek + optionele quiz per hoofdstuk)
-- ----------------------------------------------------------------------------
-- Trainers beheren hoofdstukken/secties/quizvragen (staf-only). Spelers lezen
-- en doen de quiz zonder inlog via een gedeelde link.
--
-- Beveiligingsmodel (zelfde patroon als de seizoensstart-vragenlijst, 0018):
--   * Hoofdstukken en secties zijn gewoon publiek leesbaar (geen geheime info).
--   * Quizvragen zijn NIET direct publiek leesbaar (zou het juiste antwoord
--     lekken) — spelers krijgen ze via de security-definer functie
--     academy_quiz_vragen(), die het juiste-antwoord-veld weglaat.
--   * Uitslagen (academy_quiz_resultaten) zijn alleen leesbaar voor staf.
--     Opslaan + scoren gebeurt server-side in academy_quiz_afronden(), met
--     een unieke sleutel (hoofdstuk + speler) zodat één poging per speler.
-- Draai dit in de SQL editor van het Supabase-dashboard.
-- ============================================================================

create table if not exists public.academy_hoofdstukken (
  id          uuid primary key default gen_random_uuid(),
  titel       text not null,
  volgorde    integer not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.academy_secties (
  id            uuid primary key default gen_random_uuid(),
  hoofdstuk_id  uuid not null references public.academy_hoofdstukken (id) on delete cascade,
  titel         text,
  tekst         text not null default '',
  volgorde      integer not null default 0,
  created_at    timestamptz not null default now()
);

-- Eén generiek vraagtype: 'meerkeuze' (A/B/C) of 'stelling' (waar/niet waar).
-- Beide zijn functioneel hetzelfde — "kies het juiste antwoord uit opties[]"
-- — `type` stuurt alleen hoe de vraag eruitziet.
create table if not exists public.academy_quizvragen (
  id            uuid primary key default gen_random_uuid(),
  hoofdstuk_id  uuid not null references public.academy_hoofdstukken (id) on delete cascade,
  type          text not null default 'meerkeuze' check (type in ('meerkeuze', 'stelling')),
  vraag         text not null,
  opties        jsonb not null default '[]'::jsonb, -- array van tekst-opties
  juist_index   integer not null default 0,          -- index in opties[]
  volgorde      integer not null default 0,
  created_at    timestamptz not null default now()
);

create table if not exists public.academy_quiz_resultaten (
  id              uuid primary key default gen_random_uuid(),
  hoofdstuk_id    uuid not null references public.academy_hoofdstukken (id) on delete cascade,
  speler_id       uuid not null references public.spelers (id) on delete cascade,
  score           integer not null,
  totaal          integer not null,
  fout_vraag_ids  jsonb not null default '[]'::jsonb,
  created_at      timestamptz not null default now(),
  unique (hoofdstuk_id, speler_id)
);

alter table public.academy_hoofdstukken enable row level security;
alter table public.academy_secties enable row level security;
alter table public.academy_quizvragen enable row level security;
alter table public.academy_quiz_resultaten enable row level security;

-- Hoofdstukken/secties: iedereen mag lezen (spelers, geen inlog); alleen staf
-- mag beheren.
create policy "academy_hoofdstukken_select_publiek"
  on public.academy_hoofdstukken for select using (true);
create policy "academy_hoofdstukken_schrijven_staf"
  on public.academy_hoofdstukken for insert to authenticated with check (public.is_staf());
create policy "academy_hoofdstukken_update_staf"
  on public.academy_hoofdstukken for update to authenticated
  using (public.is_staf()) with check (public.is_staf());
create policy "academy_hoofdstukken_delete_staf"
  on public.academy_hoofdstukken for delete to authenticated using (public.is_staf());

create policy "academy_secties_select_publiek"
  on public.academy_secties for select using (true);
create policy "academy_secties_schrijven_staf"
  on public.academy_secties for insert to authenticated with check (public.is_staf());
create policy "academy_secties_update_staf"
  on public.academy_secties for update to authenticated
  using (public.is_staf()) with check (public.is_staf());
create policy "academy_secties_delete_staf"
  on public.academy_secties for delete to authenticated using (public.is_staf());

-- Quizvragen: GEEN publieke select-policy (zou juist_index lekken). Staf mag
-- alles; spelers krijgen vragen alleen via academy_quiz_vragen() hieronder.
create policy "academy_quizvragen_select_staf"
  on public.academy_quizvragen for select to authenticated using (public.is_staf());
create policy "academy_quizvragen_schrijven_staf"
  on public.academy_quizvragen for insert to authenticated with check (public.is_staf());
create policy "academy_quizvragen_update_staf"
  on public.academy_quizvragen for update to authenticated
  using (public.is_staf()) with check (public.is_staf());
create policy "academy_quizvragen_delete_staf"
  on public.academy_quizvragen for delete to authenticated using (public.is_staf());

-- Resultaten: alleen staf leest (privacy — spelers zien elkaars score niet).
create policy "academy_resultaten_select_staf"
  on public.academy_quiz_resultaten for select to authenticated using (public.is_staf());
create policy "academy_resultaten_delete_staf"
  on public.academy_quiz_resultaten for delete to authenticated using (public.is_staf());

-- Vragen ophalen zonder het juiste antwoord (voor de quiz-pagina).
create or replace function public.academy_quiz_vragen(p_hoofdstuk uuid)
returns table (id uuid, type text, vraag text, opties jsonb, volgorde integer)
language sql stable security definer set search_path = public as $$
  select q.id, q.type, q.vraag, q.opties, q.volgorde
  from public.academy_quizvragen q
  where q.hoofdstuk_id = p_hoofdstuk
  order by q.volgorde, q.created_at;
$$;
grant execute on function public.academy_quiz_vragen(uuid) to anon, authenticated;

-- Spelers die déze quiz nog niet hebben gedaan (voor de naam-kiezer).
create or replace function public.academy_spelers_voor_quiz(p_hoofdstuk uuid)
returns table (id uuid, naam text, rugnummer integer)
language sql stable security definer set search_path = public as $$
  select s.id, s.naam, s.rugnummer
  from public.spelers s
  where not coalesce(s.gast, false)
    and not exists (
      select 1 from public.academy_quiz_resultaten r
      where r.hoofdstuk_id = p_hoofdstuk and r.speler_id = s.id
    )
  order by s.naam;
$$;
grant execute on function public.academy_spelers_voor_quiz(uuid) to anon, authenticated;

-- Quiz afronden: scoort server-side (het juiste antwoord komt nooit bij de
-- client) en bewaart één keer per speler per hoofdstuk.
create or replace function public.academy_quiz_afronden(
  p_hoofdstuk uuid, p_speler uuid, p_antwoorden jsonb
)
returns table (score integer, totaal integer)
language plpgsql security definer set search_path = public as $$
declare
  v_score integer := 0;
  v_totaal integer := 0;
  v_fout jsonb := '[]'::jsonb;
  r record;
  v_gekozen integer;
begin
  if not exists (select 1 from public.spelers where id = p_speler) then
    raise exception 'Onbekende speler';
  end if;

  for r in
    select id, juist_index from public.academy_quizvragen where hoofdstuk_id = p_hoofdstuk
  loop
    v_totaal := v_totaal + 1;
    v_gekozen := (p_antwoorden ->> r.id::text)::integer;
    if v_gekozen is not distinct from r.juist_index then
      v_score := v_score + 1;
    else
      v_fout := v_fout || to_jsonb(r.id);
    end if;
  end loop;

  if v_totaal = 0 then
    raise exception 'Dit hoofdstuk heeft nog geen quizvragen';
  end if;

  begin
    insert into public.academy_quiz_resultaten (hoofdstuk_id, speler_id, score, totaal, fout_vraag_ids)
    values (p_hoofdstuk, p_speler, v_score, v_totaal, v_fout);
  exception when unique_violation then
    raise exception 'Deze speler heeft deze quiz al gedaan';
  end;

  return query select v_score, v_totaal;
end;
$$;
grant execute on function public.academy_quiz_afronden(uuid, uuid, jsonb) to anon, authenticated;

notify pgrst, 'reload schema';
