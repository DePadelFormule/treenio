-- ============================================================================
-- Treenio — optionele seed voor lokaal testen.
-- ----------------------------------------------------------------------------
-- LET OP: dit koppelt NIET automatisch aan auth.users. Maak eerst gebruikers
-- aan via Supabase Auth (Dashboard → Authentication → Users), en vul daarna
-- de auth_user_id's hieronder in, of update ze via de app.
--
-- Draai dit met de service role (bv. via SQL editor in het dashboard).
-- ============================================================================

-- Voorbeeld-staf (vul auth_user_id later in)
insert into public.staf (naam, rol)
values ('Coach Demo', 'hoofdtrainer')
on conflict do nothing;

-- Voorbeeld-spelers
insert into public.spelers (naam, rugnummer, positie_voorkeur)
values
  ('Sam Spits', 9, 'spits'),
  ('Vera Verdediger', 4, 'centrale verdediger'),
  ('Kees Keeper', 1, 'keeper')
on conflict do nothing;

-- Voorbeeld-wedstrijd
insert into public.wedstrijden (datum, tegenstander, uitslag)
values (current_date - 7, 'FC Voorbeeld', '3-1')
on conflict do nothing;
