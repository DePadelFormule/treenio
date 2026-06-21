-- ============================================================================
-- Treenio — migratie 0006: externe bron-id op wedstrijden
-- ----------------------------------------------------------------------------
-- Voor het importeren van het wedstrijdprogramma uit de KNVB Dataservice
-- (voetbal.nl / Sportlink). We bewaren de KNVB-wedstrijdcode in bron_id, met
-- een unieke index, zodat herhaald synchroniseren bestaande wedstrijden
-- bijwerkt i.p.v. dubbele rijen aanmaakt (upsert op bron_id).
--
-- Handmatig toegevoegde wedstrijden houden bron_id = NULL; een unieke index
-- met NULLs toegestaan (meerdere NULLs mogen) is precies wat we willen.
-- ============================================================================

alter table public.wedstrijden
  add column if not exists bron_id text;

create unique index if not exists wedstrijden_bron_id_key
  on public.wedstrijden (bron_id)
  where bron_id is not null;

notify pgrst, 'reload schema';
