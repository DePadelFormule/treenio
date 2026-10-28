// Situaties waarvoor taken per positie vastgelegd kunnen worden. Vrij
// tekstveld in de database (geen enum), dit is alleen de lijst die de UI
// aanbiedt — later makkelijk uit te breiden met bv. "balbezit_eigen_team" of
// "omschakeling".
export const SITUATIES = [
  { key: "balbezit_tegenstander", naam: "Balbezit tegenstander" },
] as const;

export function situatieNaam(key: string): string {
  return SITUATIES.find((s) => s.key === key)?.naam ?? key;
}
