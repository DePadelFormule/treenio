# Treenio — datamodel in één overzicht

Alle tabellen, gegroepeerd per zichtbaarheidslaag, met hun RLS-scope. Bron:
`supabase/migrations/0001`–`0004`. Legenda RLS-scope:

- **team** = leesbaar voor elke ingelogde gebruiker (speler of staf)
- **eigen** = leesbaar/schrijfbaar door de betreffende speler zelf
- **staf** = uitsluitend staf

---

## Basis

### `spelers` · select: team · schrijven: staf (foto e.d. ook eigen)
| kolom | type | opmerking |
|-------|------|-----------|
| id | uuid (pk) | |
| auth_user_id | uuid | koppeling aan auth.users; bepaalt rol |
| naam | text | |
| rugnummer | int | |
| positie_voorkeur | text | voorkeur (≠ gespeelde positie) |
| foto_url | text | |
| geboortedatum | date | |
| created_at | timestamptz | |

### `staf` · select: team · schrijven: staf
| kolom | type | opmerking |
|-------|------|-----------|
| id | uuid (pk) | |
| auth_user_id | uuid | koppeling aan auth.users |
| naam | text | |
| rol | text | `hoofdtrainer` \| `assistent` |
| created_at | timestamptz | |

---

## Laag 1 — team-publiek (positief-som)

### `wedstrijden` · select: team · schrijven: staf
id · datum · tegenstander · uitslag · created_at

### `badges` · select: team · schrijven: staf
id · speler_id → spelers · type · behaald_op · created_at

### `records` · select: team · schrijven: staf
id · speler_id → spelers · soort · waarde · behaald_op · created_at

### `mvp_stemmen` · select: team · insert: speler zelf (1×/wedstrijd, niet op zichzelf)
id · wedstrijd_id → wedstrijden · stemmer_speler_id → spelers · gestemd_op_speler_id → spelers · gestemd_op · *uniek (wedstrijd_id, stemmer_speler_id)*

### `challenges` · select: team · schrijven: staf
id · titel · omschrijving · week · deadline · created_at

### `challenge_uploads` · select: team · insert/wijzig: speler zelf of staf
id · challenge_id → challenges · speler_id → spelers · video_url · ingeleverd_op

### `seizoen_awards` · select: team · schrijven: staf
id · seizoen · categorie · speler_id → spelers · toelichting · toegekend_op · created_at
> bv. speler van het jaar, meeste opkomst, meeste inzet, meest verbeterd, beste op-tijd-afmelder

---

## Laag 2 — speler + coach

### `ontwikkeldoelen` · select: staf óf de betreffende speler · schrijven: staf
id · speler_id → spelers · doel · status (`open`/`bezig`/`behaald`/`gepauzeerd`) · afgesproken_op · coach_id → staf · created_at

---

## Laag 3 — staf-only (nooit zichtbaar voor speler)

### `staf_notities` · alles: staf
id · speler_id → spelers · inschatting · verwachting · positie_inschatting · coach_id → staf · created_at

### `trainingen` · alles: staf
id · datum · type · omschrijving · created_at

### `training_registraties` · alles: staf
id · training_id → trainingen · speler_id → spelers · aanwezig · op_tijd · afmeld_status (`op_tijd`/`kort_dag`/`te_laat`/`niet_afgemeld`/`nvt`) · afgemeld_op · inzet (1–5) · opmerking · created_at · *uniek (training_id, speler_id)*

### `wedstrijd_registraties` · alles: staf
id · wedstrijd_id → wedstrijden · speler_id → spelers · op_tijd · afmeld_status · startte_als (`basis`/`wissel`/`niet_in_selectie`) · **positie** (gespeelde positie) · speelminuten · gewisseld_uit · ingevallen · volledige_bank · goals · assists · gele_kaarten (0–2) · rode_kaart · overtredingen_gemaakt · overtredingen_tegen · **balverlies** · opmerking · created_at · *uniek (wedstrijd_id, speler_id)*

### `keeper_registraties` · alles: staf
id · wedstrijd_id → wedstrijden · speler_id → spelers · hoge_ballen_gepakt · reddingen · een_op_een_reddingen · reddingen_buiten_16 · tegengoals · clean_sheet · uittrappen_lang · opbouw_van_achteruit · opmerking · created_at · *uniek (wedstrijd_id, speler_id)*

### `wedstrijd_team_stats` · alles: staf
id · wedstrijd_id → wedstrijden (uniek) · vrije_trappen_tegen · corners_tegen · goals_uit_spel · goals_uit_standaard · tegengoals_uit_spel · tegengoals_uit_standaard · created_at

---

## Aggregatie-views (staf-only via `security_invoker = on`)

| view | per | inhoud |
|------|-----|--------|
| `v_training_opkomst` | speler | geregistreerd, aanwezig, opkomst_pct, gem_inzet, afgemeld_op_tijd, afgemeld_te_laat |
| `v_wedstrijd_totalen` | speler | in_selectie, basisplaatsen, invalbeurten, keer_uit_gewisseld, keer_90_bank, totaal_minuten, goals, assists, gele_kaarten, rode_kaarten, overtredingen ±, balverlies |
| `v_keeper_totalen` | keeper | wedstrijden_keep, clean_sheets, hoge_ballen_gepakt, reddingen, een_op_een_reddingen, reddingen_buiten_16, tegengoals, uittrappen_lang, opbouw_van_achteruit |
| `v_speler_posities` | speler | per gespeelde positie het aantal wedstrijden |

---

## Hulpfuncties (RLS)

| functie | doel |
|---------|------|
| `is_staf()` | is de ingelogde gebruiker staf? (security definer) |
| `current_speler_id()` | speler-id van de ingelogde gebruiker, of NULL |
