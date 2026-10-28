// Situaties waarvoor taken per positie vastgelegd kunnen worden. Vrij
// tekstveld in de database (geen enum), dit is alleen de lijst die de UI
// aanbiedt — later makkelijk uit te breiden met bv. "balbezit_eigen_team" of
// "omschakeling".
export const SITUATIES = [
  { key: "balbezit", naam: "Balbezit" },
  { key: "balbezit_tegenstander", naam: "Balbezit tegenstander" },
  { key: "omschakeling_balverlies", naam: "Omschakeling balbezit naar balverlies" },
  { key: "omschakeling_balwinst", naam: "Omschakeling balverlies naar balbezit" },
] as const;

export function situatieNaam(key: string): string {
  return SITUATIES.find((s) => s.key === key)?.naam ?? key;
}

// Volgorde en naamgeving per shirtnummer, zoals het team ze zelf noemt.
// `code` is de bijbehorende key in FORMATIES["4-3-3"] (src/lib/formaties.ts).
// Let op: de app-labels "LA"/"LB" op het bord slaan daar op andere posities
// dan hier (bord: LA = linksbuiten-hoog, LB = linksback-laag) — hier gebruiken
// we de eigen naamgeving van het team, niet de bordlabels.
export const POSITIE_VOLGORDE = [
  { nummer: 1, naam: "Keeper", code: "gk" },
  { nummer: 2, naam: "Rechtsachter (RA)", code: "rb" },
  { nummer: 3, naam: "Laatste man (CV)", code: "rcv" },
  { nummer: 4, naam: "Voorstopper (CV)", code: "lcv" },
  { nummer: 5, naam: "Linksachter (LA)", code: "lb" },
  { nummer: 6, naam: "Controlerende middenvelder rechts (RCM)", code: "rcm" },
  { nummer: 7, naam: "Rechtsbuiten (RB)", code: "rv" },
  { nummer: 8, naam: "Controlerende middenvelder links (LCM)", code: "lcm" },
  { nummer: 9, naam: "Spits (SP)", code: "sp" },
  { nummer: 10, naam: "Aanvallende middenvelder (AMC)", code: "acm" },
  { nummer: 11, naam: "Linksbuiten (LB)", code: "lv" },
] as const;
