// Formaties voor het opstellingsbord. Coördinaten in % van het veld:
// x = links→rechts (0–100), y = boven(aanval)→onder(keeper) (0–100).
export interface Slot {
  key: string;
  label: string; // positiecode-hint
  x: number;
  y: number;
}

export const FORMATIES: Record<string, Slot[]> = {
  "4-3-3": [
    { key: "gk", label: "K", x: 50, y: 90 },
    { key: "d1", label: "RB", x: 16, y: 70 },
    { key: "d2", label: "RCV", x: 38, y: 73 },
    { key: "d3", label: "LCV", x: 62, y: 73 },
    { key: "d4", label: "LB", x: 84, y: 70 },
    { key: "m1", label: "CVM", x: 50, y: 55 },
    { key: "m2", label: "CM", x: 28, y: 45 },
    { key: "m3", label: "CM", x: 72, y: 45 },
    { key: "a1", label: "RV", x: 20, y: 22 },
    { key: "a2", label: "ST", x: 50, y: 18 },
    { key: "a3", label: "LV", x: 80, y: 22 },
  ],
  "4-4-2": [
    { key: "gk", label: "K", x: 50, y: 90 },
    { key: "d1", label: "RB", x: 16, y: 70 },
    { key: "d2", label: "RCV", x: 38, y: 73 },
    { key: "d3", label: "LCV", x: 62, y: 73 },
    { key: "d4", label: "LB", x: 84, y: 70 },
    { key: "m1", label: "RM", x: 16, y: 47 },
    { key: "m2", label: "CM", x: 38, y: 50 },
    { key: "m3", label: "CM", x: 62, y: 50 },
    { key: "m4", label: "LM", x: 84, y: 47 },
    { key: "a1", label: "ST", x: 36, y: 22 },
    { key: "a2", label: "ST", x: 64, y: 22 },
  ],
  "4-2-3-1": [
    { key: "gk", label: "K", x: 50, y: 90 },
    { key: "d1", label: "RB", x: 16, y: 72 },
    { key: "d2", label: "RCV", x: 38, y: 75 },
    { key: "d3", label: "LCV", x: 62, y: 75 },
    { key: "d4", label: "LB", x: 84, y: 72 },
    { key: "m1", label: "CVM", x: 36, y: 58 },
    { key: "m2", label: "CVM", x: 64, y: 58 },
    { key: "m3", label: "RA", x: 20, y: 38 },
    { key: "m4", label: "AM", x: 50, y: 36 },
    { key: "m5", label: "LA", x: 80, y: 38 },
    { key: "a1", label: "ST", x: 50, y: 18 },
  ],
  "3-4-3": [
    { key: "gk", label: "K", x: 50, y: 90 },
    { key: "d1", label: "RCV", x: 26, y: 72 },
    { key: "d2", label: "CV", x: 50, y: 74 },
    { key: "d3", label: "LCV", x: 74, y: 72 },
    { key: "m1", label: "RM", x: 16, y: 47 },
    { key: "m2", label: "CM", x: 38, y: 50 },
    { key: "m3", label: "CM", x: 62, y: 50 },
    { key: "m4", label: "LM", x: 84, y: 47 },
    { key: "a1", label: "RV", x: 20, y: 22 },
    { key: "a2", label: "ST", x: 50, y: 18 },
    { key: "a3", label: "LV", x: 80, y: 22 },
  ],
};

export const FORMATIE_NAMEN = Object.keys(FORMATIES);
