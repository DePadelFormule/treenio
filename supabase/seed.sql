-- ============================================================================
-- Treenio — seed: Nivo Sparta JO17-2, seizoen 26-27
-- ----------------------------------------------------------------------------
-- Draai dit met de service role (SQL editor in het Supabase-dashboard).
--
-- LET OP (auth): trainers loggen in met een eigen account. Maak per trainer
-- een gebruiker aan via Authentication → Users en koppel daarna de
-- auth_user_id, bv.:
--   update public.staf set auth_user_id = '<uuid>' where naam = 'Dennis Baggerman';
-- Spelers loggen NIET in; zij zijn puur gegevens.
-- ============================================================================

-- Trainersstaf
insert into public.staf (naam, rol) values
  ('Dennis Baggerman', 'hoofdtrainer'),
  ('Jochem Burgers',   'assistent'),
  ('Thierry Mooring',  'assistent'),
  ('Peter van Hees',   'assistent')
on conflict do nothing;

-- Selectie (rugnummer = nummer uit de teamlijst). Keeper: Amin Miaadi.
insert into public.spelers (rugnummer, naam, positie_voorkeur) values
  (1,  'Fabian Buwalda',      null),
  (2,  'Rico Baggerman',      null),
  (3,  'Osama Tarsha Kurdi',  null),
  (4,  'Adam El Amraoui',     null),
  (5,  'Myon van Hees',       null),
  (6,  'Jan-Julius van Hees', null),
  (7,  'Valentijn Kramer',    null),
  (8,  'Teun van Dongen',     null),
  (9,  'Neal Tsegay',         null),
  (10, 'Finn Thuis',          null),
  (11, 'Roan van Genderen',   null),
  (12, 'Rayhan Ahmed',        null),
  (13, 'Amin Miaadi',         'K'),
  (14, 'Kovan Almjo',         null),
  (15, 'Youssef Hammouti',    null),
  (16, 'Yassin Azzaaoui',     null),
  (17, 'Amir Shaaban',        null),
  (18, 'Mateusz Wojtowicz',   null),
  (19, 'Ghaith Tarsha',       null)
on conflict do nothing;
