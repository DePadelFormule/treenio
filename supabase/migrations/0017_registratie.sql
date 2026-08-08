-- ============================================================================
-- Treenio — migratie 0017: zelf registreren voor trainers
-- ----------------------------------------------------------------------------
-- Trainers maken zelf een account aan met e-mail + wachtwoord + registratiecode.
-- De code staat in de database (app_instellingen) en wordt bij het aanmaken
-- gecontroleerd door een trigger op auth.users — ook wie de API rechtstreeks
-- benadert komt er dus niet omheen. Een nieuw account krijgt automatisch een
-- staf-rij met rol 'assistent' en mag_conclusie = false (beperkte toegang);
-- volledige toegang blijft een bewuste actie van de hoofdtrainer.
--
-- Accounts die via het Supabase-dashboard worden aangemaakt (zonder code in de
-- metadata) blijven gewoon werken; daarvoor doet de trigger niets.
--
-- DE CODE WIJZIGEN kan altijd met:
--   update public.app_instellingen set waarde = 'NIEUWE-CODE'
--   where sleutel = 'registratie_code';
-- ============================================================================

create table if not exists public.app_instellingen (
  sleutel text primary key,
  waarde  text not null
);
-- RLS aan zonder policies: clients kunnen er niet bij; alleen security-definer
-- functies en de dashboard-beheerder.
alter table public.app_instellingen enable row level security;

insert into public.app_instellingen (sleutel, waarde)
  values ('registratie_code', 'NIVO-SPARTA-2026')
  on conflict (sleutel) do nothing;

-- Voor een nette foutmelding in het registratiescherm (vóór het aanmaken).
create or replace function public.check_registratie_code(code text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.app_instellingen
    where sleutel = 'registratie_code' and waarde = code
  );
$$;
grant execute on function public.check_registratie_code(text) to anon, authenticated;

-- Trigger: bij een nieuw auth-account mét registratiecode in de metadata de
-- code controleren en een gekoppelde staf-rij aanmaken.
create or replace function public.handle_nieuwe_gebruiker()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  juiste_code text;
  opgegeven   text;
  weergavenaam text;
begin
  opgegeven := new.raw_user_meta_data->>'registratie_code';
  -- Geen code meegegeven: aangemaakt via het dashboard/beheer. Niets doen.
  if opgegeven is null then
    return new;
  end if;

  select waarde into juiste_code
  from public.app_instellingen where sleutel = 'registratie_code';

  if juiste_code is null or opgegeven <> juiste_code then
    raise exception 'Ongeldige registratiecode';
  end if;

  weergavenaam := coalesce(
    nullif(trim(new.raw_user_meta_data->>'naam'), ''),
    split_part(new.email, '@', 1)
  );

  insert into public.staf (naam, rol, mag_conclusie, auth_user_id)
  values (weergavenaam, 'assistent', false, new.id);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_nieuwe_gebruiker();

notify pgrst, 'reload schema';
