# Treenio

Coach-/ontwikkeltool voor de trainersstaf van één voetbalteam (O17). Next.js
(App Router) + TypeScript + Supabase + Vercel, met Resend voor e-mail (later).

**Treenio is volledig staf-only.** Spelers loggen niet in en zien niets; ze zijn
gegevens die de staf beheert. Alle registratie en inschatting is uitsluitend
voor de trainers. (De eerdere spelerskant — paspoort, badges, challenges,
awards — is bewust verwijderd; zie migratie `0005`.)

## Wat de tool bijhoudt (alles staf-only)

| Tabel | Inhoud |
|-------|--------|
| `spelers` | roster: naam, rugnummer, positie-voorkeur, foto, geboortedatum |
| `staf` | trainers (hoofdtrainer/assistent) — de enige accounts |
| `wedstrijden` | datum, tegenstander, uitslag |
| `trainingen` | trainingsmomenten |
| `training_registraties` | opkomst, op-tijd, afmeld-discipline (op_tijd/kort_dag/te_laat/niet_afgemeld), inzet-rating 1–5 |
| `wedstrijd_registraties` | gespeelde positie, speelminuten, basis/wissel, eruit gewisseld, ingevallen, 90 min bank, goals, assists, geel/rood, overtredingen ±, balverlies |
| `keeper_registraties` | hoge ballen gepakt, reddingen, 1-op-1 reddingen, saves buiten 16m, clean sheet, tegengoals, distributie (lang uittrappen vs. opbouw van achteruit) |
| `wedstrijd_team_stats` | vrije trappen/corners tegen, goals & tegengoals uit spel vs. standaard |
| `ontwikkeldoelen` | ontwikkelpunten per speler (staf-only) |
| `staf_notities` | eerlijke inschatting, verwachting, positie-inschatting |

Staf-aggregatie-views (`v_training_opkomst`, `v_wedstrijd_totalen`,
`v_keeper_totalen`, `v_speler_posities`) draaien met `security_invoker = on`,
dus de staf-only RLS van de basistabellen blijft gelden.

### Architectuurregels

1. **Strikte RLS** — elke tabel is staf-only; alleen wie in de `staf`-tabel
   staat (via `is_staf()`) heeft toegang.
2. **Spelers loggen niet in** — geen speler-accounts, geen team-publieke data.
3. **AVG/privacy** — minderjarigen; alle individuele data privé bij de staf.

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
    page.tsx                      # redirect: staf → /staf, anders → /geen-toegang
    login/                        # e-mail/wachtwoord login (server action)
    geen-toegang/                 # ingelogd maar geen staf
    staf/                         # stafdashboard + speler-detail
      wedstrijden/                # lijst + nieuwe wedstrijd (server action)
      wedstrijd/[id]/registreren/ # iPad-tik invoer (per speler + keeper + team)
    auth/signout/                 # POST signout route
  components/
    SignOutButton.tsx
    registratie/                  # Stepper, SpelerRegistratieKaart, KeeperPaneel, TeamStatsPaneel
  lib/
    auth.ts                       # server-side staf-check
    constants.ts                  # positiecodes + afmeld-opties
    supabase/{client,server,middleware}.ts
    types/database.ts
supabase/
  migrations/                     # 0001–0005  ← review dit
  seed.sql
```

### Invoer-UI (iPad-tiksysteem)

`/staf/wedstrijden` → kies/maak een wedstrijd → `/staf/wedstrijd/[id]/registreren`.
Per speler tik-knoppen (goals, assists, kaarten, overtredingen, balverlies),
minuten, basis/wissel, positie-keuze en toggles (eruit gewisseld / ingevallen /
90 min bank). Aparte panelen voor de **keeper** en de **team-stats**. Opslaan
gebeurt per kaart via een server action met `upsert`.

## Status / volgende stap

Klaar: staf-only auth, het datamodel met RLS, stafdashboard, speler-detail met
alle aggregaten, en de wedstrijd-invoer. Mogelijke volgende stappen:
trainingspresentie-scherm (`/staf/training/[id]`) en beheer-flows
(spelers/staf aanmaken in de app).

## Wat we bewust NIET bouwen

Geen spelerskant (geen accounts/paspoort/badges) en geen
logistiek/teammanagement (daar is Spond goed in).
