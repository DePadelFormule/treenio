# Treenio

Speler­ontwikkel- en coachplatform voor één voetbalteam (O17). Next.js (App
Router) + TypeScript + Supabase + Vercel, met Resend voor e-mail (later).

De wig van Treenio is de **privé coach-/ontwikkellaag** die Voetbal.nl, Spond en
Tonsser níét doen. Het moet leuk zijn voor de spelers én een serieus hulpmiddel
voor de staf.

## Kernconcept: drie zichtbaarheidslagen

| Laag | Wie ziet het | Voorbeelden |
|------|--------------|-------------|
| **1 — team-publiek** | hele team | badges, streaks, records, MVP-stemmen, challenges |
| **2 — speler + coach** | staf + die ene speler | afgesproken ontwikkeldoelen (geen cijfers) |
| **3 — staf-only** | uitsluitend staf | eerlijke inschatting, verwachting, positie-inschatting |

Het functioneringsgesprek splitst in tweeën: afgesproken doelen → Laag 2,
eerlijke inschatting → Laag 3.

### Harde architectuurregels

1. **Drie aparte tabellen per laag** — géén `is_zichtbaar`-vlaggetje. Fysieke
   scheiding zodat Laag 3 nooit kan lekken.
2. **Strikte RLS per scope** (zie `supabase/migrations/0001_init.sql`).
3. **Geen enkele losse OVR/totaalscore** op het kaartje. Het paspoort is
   identiteit + mijlpalen, geen skill-rating.
4. **AVG/privacy** — minderjarigen. Individuele ontwikkeldata privé per speler.

## Setup

```bash
npm install
cp .env.example .env.local   # vul je Supabase-keys in
npm run dev
```

### Supabase

1. Maak een Supabase-project.
2. Draai de migratie `supabase/migrations/0001_init.sql` (SQL editor of CLI).
   Deze zet alle tabellen + RLS-policies per laag aan. **Lees dit bestand
   eerst — het is bewust apart gehouden zodat je de policies kunt reviewen.**
3. (Optioneel) `supabase/seed.sql` voor wat testdata.
4. Maak gebruikers aan in Authentication en koppel hun `auth_user_id` aan een
   rij in `spelers` of `staf`. Die koppeling bepaalt de rol.

> Na elke nieuwe kolom later: `notify pgrst, 'reload schema';` — anders wordt
> het veld stil genegeerd. En zorg altijd voor een UPDATE-policy.

## Mappenstructuur

```
src/
  app/
    page.tsx                      # role-based redirect
    login/                        # e-mail/wachtwoord login (server action)
    paspoort/                     # speler: eigen kaartje + Laag 2-doelen
    staf/                         # stafdashboard + speler-detail (3 lagen)
    geen-koppeling/               # ingelogd maar nog niet gekoppeld
    auth/signout/                 # POST signout route
  components/
    PlayerCard.tsx                # FIFA-achtig kaartje (geen OVR)
    SignOutButton.tsx
  lib/
    auth.ts                       # server-side rolbepaling
    supabase/{client,server,middleware}.ts
    types/database.ts
supabase/
  migrations/0001_init.sql        # tabellen + RLS per laag  ← review dit
  seed.sql
```

## Status / volgende stap

Klaar in deze scaffold: auth + twee rollen, role-based routing, het volledige
datamodel met RLS per laag, en het speler-paspoort met kaartje. **De
post-wedstrijd-flow en de schrijfkant van de drie-lagen ontwikkeltracking
staan bewust nog uit** — eerst review van de SQL/policies.

## Wat we bewust NIET bouwen

Geen logistiek/teammanagement (daar is Spond goed in) en geen publieke
per-wedstrijd-rating à la Tonsser (dat legt de pikorde vast — precies ons
verschil).
