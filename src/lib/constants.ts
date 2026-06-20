// Gedeelde keuzelijsten voor de invoer-UI.

// Vaste positiecodes zodat de groepering schoon blijft (v_speler_posities).
export const POSITIE_CODES = [
  "K",   // keeper
  "RB",  // rechtsback
  "RCV", // rechter centrale verdediger
  "CV",  // centrale verdediger
  "LCV", // linker centrale verdediger
  "LB",  // linksback
  "CVM", // controlerende middenvelder
  "CM",  // centrale middenvelder
  "AM",  // aanvallende middenvelder
  "RM",  // rechtermidden
  "LM",  // linkermidden
  "RV",  // rechtervleugel
  "LV",  // linkervleugel
  "ST",  // spits
] as const;

export const AFMELD_OPTIES: { value: string; label: string }[] = [
  { value: "nvt", label: "—" },
  { value: "op_tijd", label: "Op tijd afgemeld (≥24u)" },
  { value: "kort_dag", label: "Kort dag afgemeld (12–24u)" },
  { value: "te_laat", label: "Te laat afgemeld (<12u)" },
  { value: "niet_afgemeld", label: "Niet afgemeld (no-show)" },
];

export const STARTTE_ALS_OPTIES: { value: string; label: string }[] = [
  { value: "basis", label: "Basis" },
  { value: "wissel", label: "Wissel" },
  { value: "niet_in_selectie", label: "Niet in selectie" },
];
