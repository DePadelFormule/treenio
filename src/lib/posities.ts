import type { Systeem } from "@/lib/types/database";

// Positie-definities per systeem. Coördinaten (x/y in %) plaatsen het
// nummertje op het veld; `code` is de afkorting die de trainer in de tabel
// kiest en `naam` is de volledige omschrijving voor de legenda.
export interface Slot {
  nr: number;
  code: string;
  naam: string;
  x: number;
  y: number;
}

export const FORMATIES: Record<Systeem, Slot[]> = {
  "4-3-3": [
    { nr: 1, code: "K", naam: "Keeper", x: 50, y: 95 },
    { nr: 2, code: "RA", naam: "Rechtsachter", x: 92, y: 64 },
    { nr: 4, code: "RCV", naam: "Rechter centrale verdediger", x: 67, y: 87 },
    { nr: 3, code: "LCV", naam: "Linker centrale verdediger", x: 33, y: 87 },
    { nr: 5, code: "LA", naam: "Linksachter", x: 8, y: 64 },
    { nr: 6, code: "RCM", naam: "Rechter centrale middenvelder", x: 70, y: 46 },
    { nr: 8, code: "LCM", naam: "Linker centrale middenvelder", x: 30, y: 46 },
    { nr: 10, code: "AMC", naam: "Aanvallende middenvelder centraal", x: 50, y: 27 },
    { nr: 7, code: "RB", naam: "Rechtsbuiten", x: 90, y: 13 },
    { nr: 11, code: "LB", naam: "Linksbuiten", x: 10, y: 13 },
    { nr: 9, code: "SP", naam: "Spits", x: 50, y: 6 },
  ],
  "4-4-2": [
    { nr: 1, code: "K", naam: "Keeper", x: 50, y: 95 },
    { nr: 2, code: "RA", naam: "Rechtsachter", x: 93, y: 72 },
    { nr: 4, code: "RCV", naam: "Rechter centrale verdediger", x: 70, y: 88 },
    { nr: 3, code: "LCV", naam: "Linker centrale verdediger", x: 28, y: 88 },
    { nr: 5, code: "LA", naam: "Linksachter", x: 7, y: 72 },
    { nr: 6, code: "CVM", naam: "Controlerende middenvelder", x: 50, y: 58 },
    { nr: 8, code: "LM", naam: "Linkermiddenvelder", x: 6, y: 40 },
    { nr: 7, code: "RM", naam: "Rechtermiddenvelder", x: 92, y: 40 },
    { nr: 10, code: "AMC", naam: "Aanvallende middenvelder centraal", x: 50, y: 28 },
    { nr: 11, code: "SPL", naam: "Spits (links)", x: 31, y: 9 },
    { nr: 9, code: "SPR", naam: "Spits (rechts)", x: 64, y: 9 },
  ],
};

export const SYSTEMEN: Systeem[] = ["4-3-3", "4-4-2"];

// Unieke pos ­itiecodes per systeem (voor de dropdowns). In het 4-4-2 hebben de
// twee spitsen een eigen code zodat elke plek los te kiezen is.
export function codesVan(systeem: Systeem): string[] {
  return FORMATIES[systeem].map((s) => s.code);
}

export function slotVanCode(systeem: Systeem, code: string): Slot | undefined {
  return FORMATIES[systeem].find((s) => s.code === code);
}

// Vertaling van de inventarisatie-codes (hierboven) naar de positiecodes van
// de spelerskaart (POSITIE_CODES in constants.ts). Let op de valse vrienden:
// in de inventarisatie is RB rechtsbuiten en LB linksbuiten, op de kaart zijn
// dat rechtsback en linksback. Meerdere inventarisatie-codes kunnen op
// dezelfde kaartcode uitkomen (RCM/LCM → CM, SP/SPL/SPR → ST); punten worden
// dan opgeteld.
export const NAAR_KAARTCODE: Record<string, string> = {
  K: "K",
  RA: "RB",   // rechtsachter → rechtsback
  RCV: "RCV",
  LCV: "LCV",
  LA: "LB",   // linksachter → linksback
  RCM: "CM",
  LCM: "CM",
  CVM: "CVM",
  AMC: "AM",
  RM: "RM",
  LM: "LM",
  RB: "RV",   // rechtsbuiten → rechtervleugel
  LB: "LV",   // linksbuiten → linkervleugel
  SP: "ST",
  SPL: "ST",
  SPR: "ST",
};
