-- ============================================================================
-- Treenio — migratie 0018: seizoensstart-vragenlijst voor spelers
-- ----------------------------------------------------------------------------
-- Spelers vullen zonder inlog een vragenlijst in via een gedeelde link.
-- Beveiligingsmodel:
--   * De antwoorden-tabel is alleen leesbaar voor staf (RLS).
--   * Anoniem verkeer kan uitsluitend twee security-definer functies aanroepen:
--       - vragenlijst_spelers(): namen van spelers die nog NIET hebben
--         ingevuld (naam-op-slot: ingevuld = weg uit de keuzelijst).
--       - vragenlijst_opslaan(): eenmalig opslaan; een tweede poging voor
--         dezelfde speler wordt geweigerd.
-- Draai dit in de SQL editor van het Supabase-dashboard.
-- ============================================================================

create table if not exists public.vragenlijst_antwoorden (
  id uuid primary key default gen_random_uuid(),
  speler_id uuid not null unique references public.spelers(id) on delete cascade,
  antwoorden jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.vragenlijst_antwoorden enable row level security;

-- Lezen: alleen staf. Schrijven kan uitsluitend via de definer-functie.
create policy "va_select" on public.vragenlijst_antwoorden for select to authenticated
  using (public.is_staf());
create policy "va_delete" on public.vragenlijst_antwoorden for delete to authenticated
  using (public.is_staf());

-- Spelers die nog niet hebben ingevuld (voor de naam-kiezer op het formulier).
create or replace function public.vragenlijst_spelers()
returns table (id uuid, naam text, rugnummer integer)
language sql stable security definer set search_path = public as $$
  select s.id, s.naam, s.rugnummer
  from public.spelers s
  where not exists (
    select 1 from public.vragenlijst_antwoorden a where a.speler_id = s.id
  )
  order by s.naam;
$$;
grant execute on function public.vragenlijst_spelers() to anon, authenticated;

-- Eenmalig opslaan van de antwoorden van één speler.
create or replace function public.vragenlijst_opslaan(p_speler uuid, p_antwoorden jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_antwoorden is null or pg_column_size(p_antwoorden) > 60000 then
    raise exception 'Antwoorden ontbreken of zijn te groot';
  end if;
  if not exists (select 1 from public.spelers where id = p_speler) then
    raise exception 'Onbekende speler';
  end if;
  begin
    insert into public.vragenlijst_antwoorden (speler_id, antwoorden)
    values (p_speler, p_antwoorden);
  exception when unique_violation then
    raise exception 'Deze speler heeft de vragenlijst al ingevuld';
  end;
end;
$$;
grant execute on function public.vragenlijst_opslaan(uuid, jsonb) to anon, authenticated;

notify pgrst, 'reload schema';
