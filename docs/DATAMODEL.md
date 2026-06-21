# Treenio — datamodel in één overzicht

Treenio is **volledig staf-only**: alleen wie in de `staf`-tabel staat (via
`is_staf()`) heeft toegang. Spelers loggen niet in. Bron:
`supabase/migrations/0001`–`0005`.

> Migratie `0005` heeft de oude spelerskant verwijderd (badges, records,
> mvp_stemmen, challenges, challenge_uploads, seizoen_awards) en de overige
> tabellen dichtgezet op staf-only.

---

## Basis

### `spelers` — roster (staf-only)
id · auth_user_id · naam · rugnummer · positie_voorkeur · foto_url · geboortedatum · created_at

### `staf` — de enige accounts (staf-only)
id · auth_user_id · naam · rol (`hoofdtrainer`/`assistent`) · created_at

---

## Registratie

### `wedstrijden`
id · datum · tegenstander · uitslag · created_at

### `trainingen`
id · datum · type · omschrijving · created_at

### `training_registraties` · *uniek (training_id, speler_id)*
id · training_id → trainingen · speler_id → spelers · aanwezig · op_tijd · afmeld_status (`op_tijd`/`kort_dag`/`te_laat`/`niet_afgemeld`/`nvt`) · afgemeld_op · inzet (1–5) · opmerking · created_at

### `wedstrijd_registraties` · *uniek (wedstrijd_id, speler_id)*
id · wedstrijd_id → wedstrijden · speler_id → spelers · op_tijd · afmeld_status · startte_als (`basis`/`wissel`/`niet_in_selectie`) · positie · speelminuten · gewisseld_uit · ingevallen · volledige_bank · goals · assists · gele_kaarten (0–2) · rode_kaart · overtredingen_gemaakt · overtredingen_tegen · balverlies · opmerking · created_at

### `keeper_registraties` · *uniek (wedstrijd_id, speler_id)*
id · wedstrijd_id → wedstrijden · speler_id → spelers · hoge_ballen_gepakt · reddingen · een_op_een_reddingen · reddingen_buiten_16 · tegengoals · clean_sheet · uittrappen_lang · opbouw_van_achteruit · opmerking · created_at

### `wedstrijd_team_stats` · *uniek (wedstrijd_id)*
id · wedstrijd_id → wedstrijden · vrije_trappen_tegen · corners_tegen · goals_uit_spel · goals_uit_standaard · tegengoals_uit_spel · tegengoals_uit_standaard · created_at

---

## Inschatting / ontwikkeling

### `ontwikkeldoelen`
id · speler_id → spelers · doel · status (`open`/`bezig`/`behaald`/`gepauzeerd`) · afgesproken_op · coach_id → staf · created_at

### `staf_notities`
id · speler_id → spelers · inschatting · verwachting · positie_inschatting · coach_id → staf · created_at

---

## Aggregatie-views (staf-only via `security_invoker = on`)

| view | per | inhoud |
|------|-----|--------|
| `v_training_opkomst` | speler | geregistreerd, aanwezig, opkomst_pct, gem_inzet, afgemeld_op_tijd, afgemeld_te_laat |
| `v_wedstrijd_totalen` | speler | in_selectie, basisplaatsen, invalbeurten, keer_uit_gewisseld, keer_90_bank, totaal_minuten, goals, assists, kaarten, overtredingen ±, balverlies |
| `v_keeper_totalen` | keeper | wedstrijden_keep, clean_sheets, hoge_ballen_gepakt, reddingen, een_op_een_reddingen, reddingen_buiten_16, tegengoals, uittrappen_lang, opbouw_van_achteruit |
| `v_speler_posities` | speler | per gespeelde positie het aantal wedstrijden |

---

## Hulpfunctie (RLS)

| functie | doel |
|---------|------|
| `is_staf()` | is de ingelogde gebruiker staf? (security definer) — de basis van álle policies |
