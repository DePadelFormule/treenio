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
| **3 — staf-only** | uitsluitend staf | eerlijke inschatting, verwachting, positie-inschatting, **alle ruwe trainings-/wedstrijdregistratie** |

### Trainers-registratie (migratie 0002)

De staf legt feiten vast (bedoeld voor het iPad-tiksysteem). **Alle ruwe
registratie is staf-only** — spelers zien hun rauwe cijfers nooit. Naar Laag 1
sijpelen uitsluitend positief-som afgeleiden (badges, records, awards).

| Tabel | Scope | Inhoud |
|-------|-------|--------|
| `trainingen` | staf-only | trainingsmomenten |
| `training_registraties` | staf-only | opkomst, op-tijd, afmeld-discipline (op_tijd/kort_dag/te_laat/niet_afgemeld), inzet-rating 1–5 |
| `wedstrijd_registraties` | staf-only | speelminuten, basis/wissel, eruit gewisseld, ingevallen, 90 min bank, goals, assists, geel/rood, overtredingen ±, balverlies |
| `keeper_registraties` | staf-only | hoge ballen gepakt, reddingen, 1-op-1 reddingen, saves buiten 16m, clean sheet, tegengoals, distributie (lang uittrappen vs. opbouw van achteruit) |
| `wedstrijd_team_stats` | staf-only | vrije trappen/corners tegen, goals & tegengoals uit spel vs. standaard |
| `seizoen_awards` | **Laag 1** | speler van het jaar, meeste opkomst/inzet, meest verbeterd, beste op-tijd-afmelder |

Staf-aggregatie-views (`v_training_opkomst`, `v_wedstrijd_totalen`) draaien met
`security_invoker = on`, dus de staf-only RLS van de basistabellen blijft gelden.

**Afmeld-discipline:** privé teller voor staf; publiek alleen de positieve badge
"beste op-tijd-afmelder". Geen publiek minpunt → geen afrekenboard.

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
