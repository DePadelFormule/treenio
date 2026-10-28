-- Wedstrijden krijgen een fase-nummer (net als "competitie"/"beker"), zodat je
-- het programma van fase 1 en fase 2 los kunt bekijken. Fase 1 is net
-- afgerond, dus alle bestaande wedstrijden krijgen fase 1.
alter table public.wedstrijden add column if not exists fase integer;

update public.wedstrijden set fase = 1 where fase is null;
