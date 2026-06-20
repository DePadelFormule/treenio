-- ============================================================================
-- Treenio — migratie 0004: gespeelde positie per wedstrijd
-- ----------------------------------------------------------------------------
-- Jeugd speelt vaak op wisselende posities. We leggen de FEITELIJK gespeelde
-- positie per wedstrijd vast op de per-speler registratie (staf-only,
-- Laag 3-scope).
--
-- Niet te verwarren met:
--   * spelers.positie_voorkeur  → voorkeur op het profiel (team-publiek)
--   * staf_notities.positie_inschatting → OORDEEL van de staf (Laag 3)
-- Dit veld is puur registratie: waar stond hij die wedstrijd.
--
-- Vrij tekstveld zodat de jeugdvariatie past (codes als 'ST', 'RV', 'CV',
-- 'CVM', 'LB', 'K', ...). Een vaste keuzelijst zetten we later in de UI zodat
-- de groepering schoon blijft.
-- ============================================================================

alter table public.wedstrijd_registraties
  add column if not exists positie text;

-- Overzicht: hoe vaak speelde een speler op welke positie?
create or replace view public.v_speler_posities
with (security_invoker = on) as
select
  wr.speler_id,
  wr.positie,
  count(*) as aantal
from public.wedstrijd_registraties wr
where wr.positie is not null
  and wr.startte_als <> 'niet_in_selectie'
group by wr.speler_id, wr.positie;

notify pgrst, 'reload schema';
