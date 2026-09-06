-- ============================================================================
-- Treenio — migratie 0033: Amin en Teun wisselen van plek in de materiaaldienst
-- ----------------------------------------------------------------------------
-- Amin is pas over een aantal weken voor het eerst aan de beurt, in plaats
-- van als tweede al. Wisselt Amin en Teun overal om waar ze al ingepland
-- stonden (nieuwe weken gebruiken voortaan sowieso de omgewisselde volgorde).
-- Draai dit in de SQL editor van het Supabase-dashboard.
-- ============================================================================

do $$
declare
  amin_id uuid;
  teun_id uuid;
begin
  select id into amin_id from public.spelers where naam ilike 'amin%' limit 1;
  select id into teun_id from public.spelers where naam ilike 'teun%' limit 1;

  if amin_id is null or teun_id is null then
    raise notice 'Amin of Teun niet gevonden in spelers — niets gewisseld.';
    return;
  end if;

  update public.materiaaldienst_sessies
  set
    speler_1_id = case
      when speler_1_id = amin_id then teun_id
      when speler_1_id = teun_id then amin_id
      else speler_1_id
    end,
    speler_2_id = case
      when speler_2_id = amin_id then teun_id
      when speler_2_id = teun_id then amin_id
      else speler_2_id
    end
  where speler_1_id in (amin_id, teun_id) or speler_2_id in (amin_id, teun_id);
end $$;

notify pgrst, 'reload schema';
