-- ============================================================================
-- Treenio — migratie 0034: dubbele trainingsdata opruimen
-- ----------------------------------------------------------------------------
-- "Genereer di/do trainingen" checkte vooraf op bestaande datums, maar dat
-- was geen echte database-garantie — bij twee keer (snel) klikken of twee
-- open tabbladen kon dezelfde datum dubbel worden aangemaakt, met als gevolg
-- dubbele kolommen in de presentielijst.
--
-- Deze migratie:
-- 1) voegt per dubbele datum de presentie-registraties samen op de oudste
--    rij (waar de oudste al iets had ingevuld, blijft dat staan; ontbrekende
--    spelers worden aangevuld vanuit de duplicaat);
-- 2) verhuist een eventuele materiaaldienst-sessie mee (of gooit 'm weg als
--    de oudste rij er al een heeft);
-- 3) verwijdert de duplicaat-trainingen zelf;
-- 4) zet een unieke constraint op de datum, zodat dit niet meer kan
--    gebeuren.
-- Draai dit in de SQL editor van het Supabase-dashboard.
-- ============================================================================

do $$
declare
  dup record;
  keep_id uuid;
  other_id uuid;
begin
  for dup in
    select datum, (array_agg(id order by created_at, id))[1] as keep,
           array_agg(id order by created_at, id) as ids
    from public.trainingen
    group by datum
    having count(*) > 1
  loop
    keep_id := dup.keep;
    for other_id in select unnest(dup.ids) except select dup.keep loop
      -- Presentie: alleen overzetten waar de te behouden training nog geen
      -- registratie voor die speler heeft, zodat bestaande invoer niet
      -- overschreven wordt.
      update public.training_registraties tr
      set training_id = keep_id
      where tr.training_id = other_id
        and not exists (
          select 1 from public.training_registraties k
          where k.training_id = keep_id and k.speler_id = tr.speler_id
        );

      delete from public.training_registraties where training_id = other_id;

      -- Materiaaldienst: bestaande sessie op de te behouden training wint,
      -- anders verhuist de sessie van de duplicaat mee.
      if exists (select 1 from public.materiaaldienst_sessies where training_id = keep_id) then
        delete from public.materiaaldienst_sessies where training_id = other_id;
      else
        update public.materiaaldienst_sessies set training_id = keep_id where training_id = other_id;
      end if;

      delete from public.trainingen where id = other_id;
    end loop;
  end loop;
end $$;

alter table public.trainingen
  add constraint trainingen_datum_uniek unique (datum);

notify pgrst, 'reload schema';
