// Gedeelde keuzelijsten voor de invoer-UI.

// Vaste positiecodes — dezelfde afkortingen als de positie-inventarisatie
// (4-3-3), zodat de hele app één taal spreekt.
export const POSITIE_CODES = [
  "K",   // keeper
  "RA",  // rechtsachter
  "RCV", // rechter centrale verdediger
  "LCV", // linker centrale verdediger
  "LA",  // linksachter
  "RCM", // rechter centrale middenvelder
  "AMC", // aanvallende middenvelder centraal
  "LCM", // linker centrale middenvelder
  "LB",  // linksbuiten
  "SP",  // spits
  "RB",  // rechtsbuiten
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
