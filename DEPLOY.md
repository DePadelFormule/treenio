# Treenio live zetten — stap voor stap (gratis)

Dit zet Treenio gratis online met **Supabase** (database + login) en **Vercel**
(hosting). Tijd: ~15 minuten. Je hebt geen betaald domein nodig — je krijgt een
gratis adres `…vercel.app`.

Je hebt nodig: een GitHub-account (de code staat er al), en gratis accounts bij
[supabase.com](https://supabase.com) en [vercel.com](https://vercel.com)
(beide kun je met je GitHub-account aanmaken).

---

## Deel A — Supabase (database + login)

### 1. Project aanmaken
1. Log in op supabase.com → **New project**.
2. Naam: `treenio`. Kies een sterk **database-wachtwoord** (bewaar het) en een
   regio dichtbij (bijv. *West EU (Frankfurt)*).
3. Wacht tot het project klaar is (~2 min).

### 2. Het schema laden
1. Linksin: **SQL Editor** → **New query**.
2. Open `supabase/schema.sql` uit deze repo, kopieer **de volledige inhoud**,
   plak het in de editor en klik **Run**.
3. Je hoort onderaan "Success" te zien. Hiermee staan alle tabellen + RLS erin.

### 3. De selectie laden (Nivo Sparta JO17-2)
1. Nieuwe query → plak de inhoud van `supabase/seed.sql` → **Run**.
2. Hiermee staan de 19 spelers en de 4 trainers in de database.

### 4. API-sleutels ophalen
Ga naar **Project Settings → API** en noteer:
- **Project URL** → `https://xxxx.supabase.co`
- **anon public** key (de lange string onder *Project API keys*)

Deze twee heb je zo nodig bij Vercel.

### 5. Trainers een login geven
Spelers loggen niet in; trainers wel. Per trainer:
1. **Authentication → Users → Add user → Create new user**. Vul e-mail +
   wachtwoord in, zet **Auto Confirm User** aan, en maak aan.
2. Kopieer de **User UID** van die nieuwe gebruiker.
3. Ga naar **SQL Editor** en koppel de UID aan de juiste trainer, bijv.:
   ```sql
   update public.staf
   set auth_user_id = 'PLAK-HIER-DE-USER-UID'
   where naam = 'Dennis Baggerman';
   ```
   Herhaal dit per trainer (Jochem Burgers, Thierry Mooring, Peter van Hees).

> Belangrijk: zonder deze koppeling kom je na inloggen op "Geen toegang" —
> de app herkent je dan niet als staf.

---

## Deel B — Vercel (de app online)

### 6. Repo importeren
1. Log in op vercel.com → **Add New… → Project**.
2. Kies de GitHub-repo **treenio**. Vercel herkent Next.js automatisch.
3. **Production branch**: zet deze op `claude/gracious-mayer-teedxe` (de branch
   waar de code op staat), of merge die branch eerst naar `main`. Vraag het me
   gerust, dan help ik met mergen.

### 7. Omgevingsvariabelen
Vouw **Environment Variables** open en voeg toe:

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | je Project URL uit stap 4 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | je anon public key uit stap 4 |

(Resend is optioneel; die kun je later toevoegen.)

### 8. Deployen
Klik **Deploy**. Na ~1 minuut krijg je een adres als
`https://treenio-xxxx.vercel.app`. Open dat, log in met een trainer-account uit
stap 5 → je komt op het stafdashboard. 🎉

---

## Optioneel (later)

- **Eigen domein** (bijv. `treenio.nl`, ~€10/jaar): Vercel → Project →
  **Domains** → toevoegen en de DNS volgen.
- **Supabase pauzeert** na ~7 dagen niets-doen op het gratis plan. Je hervat het
  met één klik in het dashboard.

## Aanpassingen later doorvoeren
De app hangt aan de GitHub-branch. Elke nieuwe push naar die branch deployt
Vercel automatisch opnieuw. Dus: ik pas iets aan → push → een halve minuut later
staat het live. Database-wijzigingen draai je als los SQL-blok in de SQL editor
(ik lever ze dan kant-en-klaar aan).

## Vastgelopen?
Stuur me de foutmelding (of een screenshot van de stap). Veelvoorkomend:
- **"Geen toegang" na inloggen** → de `auth_user_id`-koppeling uit stap 5 mist.
- **Lege schermen / 500** → controleer de twee env-vars in stap 7 (exact
  overgenomen, geen spaties) en redeploy.
