-- ============================================================================
-- Treenio — migratie 0025: foto van het papieren wedstrijdverslag
-- ----------------------------------------------------------------------------
-- Het lege A4-formulier wordt tijdens de wedstrijd met pen ingevuld; daarna
-- maak je er een foto van en hang je die aan het verslag. Eén foto per
-- wedstrijd (nieuwe upload vervangt de oude).
-- Draai dit in de SQL editor van het Supabase-dashboard.
-- ============================================================================

alter table public.wedstrijd_verslag
  add column if not exists foto_pad text;

-- Openbare storage-bucket voor de foto's (lezen kan via de link; uploaden,
-- vervangen en verwijderen alleen door staf).
insert into storage.buckets (id, name, public)
values ('verslagfotos', 'verslagfotos', true)
on conflict (id) do nothing;

drop policy if exists "verslagfoto_insert_staf" on storage.objects;
create policy "verslagfoto_insert_staf"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'verslagfotos' and public.is_staf());

drop policy if exists "verslagfoto_update_staf" on storage.objects;
create policy "verslagfoto_update_staf"
  on storage.objects for update to authenticated
  using (bucket_id = 'verslagfotos' and public.is_staf())
  with check (bucket_id = 'verslagfotos' and public.is_staf());

drop policy if exists "verslagfoto_delete_staf" on storage.objects;
create policy "verslagfoto_delete_staf"
  on storage.objects for delete to authenticated
  using (bucket_id = 'verslagfotos' and public.is_staf());

notify pgrst, 'reload schema';
