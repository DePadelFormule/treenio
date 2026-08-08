// Formaties voor het opstellingsbord. Coördinaten in % van het veld:
// x = links→rechts (0 = links, 100 = rechts), y = boven(aanval)→onder(keeper).
// De labels zijn alleen hints in lege posities (bij Nivo Sparta-benamingen).
export interface Slot {
  key: string;
  label: string;
  x: number;
  y: number;
}

export const FORMATIES: Record<string, Slot[]> = {
  // 4-3-3 met de punt naar voren: 2 centrale mids (RCM/LCM) + 1 aanvallende
  // mid (AMC) ervoor.
  "4-3-3": [
    { key: "gk", label: "K", x: 50, y: 90 },
    { key: "lv", label: "LA", x: 15, y: 70 },
    { key: "lcv", label: "LCV", x: 39, y: 73 },
    { key: "rcv", label: "RCV", x: 61, y: 73 },
    { key: "rv", label: "RA", x: 85, y: 70 },
    { key: "lcm", label: "LCM", x: 33, y: 53 },
    { key: "rcm", label: "RCM", x: 67, y: 53 },
    { key: "acm", label: "AMC", x: 50, y: 37 },
    { key: "lb", label: "LB", x: 18, y: 20 },
    { key: "sp", label: "SP", x: 50, y: 15 },
    { key: "rb", label: "RB", x: 82, y: 20 },
  ],
  "4-4-2": [
    { key: "gk", label: "K", x: 50, y: 90 },
    { key: "lv", label: "LA", x: 15, y: 72 },
    { key: "lcv", label: "LCV", x: 39, y: 74 },
    { key: "rcv", label: "RCV", x: 61, y: 74 },
    { key: "rv", label: "RA", x: 85, y: 72 },
    { key: "lm", label: "LM", x: 15, y: 48 },
    { key: "lcm", label: "LCM", x: 39, y: 50 },
    { key: "rcm", label: "RCM", x: 61, y: 50 },
    { key: "rm", label: "RM", x: 85, y: 48 },
    { key: "ls", label: "SP", x: 38, y: 20 },
    { key: "rs", label: "SP", x: 62, y: 20 },
  ],
  "4-2-3-1": [
    { key: "gk", label: "K", x: 50, y: 90 },
    { key: "lv", label: "LA", x: 15, y: 73 },
    { key: "lcv", label: "LCV", x: 39, y: 75 },
    { key: "rcv", label: "RCV", x: 61, y: 75 },
    { key: "rv", label: "RA", x: 85, y: 73 },
    { key: "lcm", label: "CVM", x: 36, y: 58 },
    { key: "rcm", label: "CVM", x: 64, y: 58 },
    { key: "lb", label: "LB", x: 18, y: 38 },
    { key: "acm", label: "AMC", x: 50, y: 36 },
    { key: "rb", label: "RB", x: 82, y: 38 },
    { key: "sp", label: "SP", x: 50, y: 16 },
  ],
  "3-4-3": [
    { key: "gk", label: "K", x: 50, y: 90 },
    { key: "lcv", label: "LCV", x: 27, y: 72 },
    { key: "cv", label: "CV", x: 50, y: 74 },
    { key: "rcv", label: "RCV", x: 73, y: 72 },
    { key: "lm", label: "LM", x: 15, y: 48 },
    { key: "lcm", label: "LCM", x: 39, y: 50 },
    { key: "rcm", label: "RCM", x: 61, y: 50 },
    { key: "rm", label: "RM", x: 85, y: 48 },
    { key: "lb", label: "LB", x: 18, y: 20 },
    { key: "sp", label: "SP", x: 50, y: 15 },
    { key: "rb", label: "RB", x: 82, y: 20 },
  ],
};

export const FORMATIE_NAMEN = Object.keys(FORMATIES);
