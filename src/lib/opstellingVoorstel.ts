// Bepaalt een voorgestelde opstelling op basis van trainingsopkomst (week
// van de wedstrijd, die maand, all-time) en speelminuten. Puur en zonder
// database-toegang, zodat het los te overzien en te testen is — het ophalen
// van de cijfers gebeurt in de server action die deze functie aanroept.
export interface VoorstelSpeler {
  id: string;
  hoofdpositie: string | null;
  alt_positie_1: string | null;
  alt_positie_2: string | null;
  weekPct: number;
  maandPct: number;
  allTimePct: number;
  minuten: number;
}

interface Slot {
  key: string;
  label: string;
}

function posities(s: VoorstelSpeler): string[] {
  return [s.hoofdpositie, s.alt_positie_1, s.alt_positie_2]
    .filter((p): p is string => !!p)
    .map((p) => p.trim().toUpperCase());
}

// Rangschikking: eerst opkomst deze week, dan deze maand, dan all-time —
// wie daarin gelijk staat maar minder speelminuten heeft gemaakt krijgt
// voorrang. Een speler met veel minuten die evengoed (of beter) traint zakt
// dus niet automatisch: hij blijft bovenaan zolang zijn opkomst gelijk of
// hoger is, de minuten geven pas de doorslag bij een gelijke opkomst.
function vergelijk(a: VoorstelSpeler, b: VoorstelSpeler) {
  if (b.weekPct !== a.weekPct) return b.weekPct - a.weekPct;
  if (b.maandPct !== a.maandPct) return b.maandPct - a.maandPct;
  if (b.allTimePct !== a.allTimePct) return b.allTimePct - a.allTimePct;
  return a.minuten - b.minuten;
}

export function stelOpstellingSamen(spelers: VoorstelSpeler[], slots: Slot[]) {
  const ranked = [...spelers].sort(vergelijk);
  const veld: Record<string, string> = {};
  const gebruikt = new Set<string>();

  // Keeper: alleen invullen met iemand die K als (alt-)positie heeft, nooit
  // met een willekeurige veldspeler.
  const keeperSlot = slots.find((s) => s.label.toUpperCase() === "K");
  if (keeperSlot) {
    const keeper = ranked.find((s) => !gebruikt.has(s.id) && posities(s).includes("K"));
    if (keeper) {
      veld[keeperSlot.key] = keeper.id;
      gebruikt.add(keeper.id);
    }
  }

  // Veldspelers: in volgorde van ranking op hun eigen (alt-)voorkeurspositie
  // zetten, zolang die nog vrij is.
  for (const speler of ranked) {
    if (gebruikt.has(speler.id)) continue;
    for (const label of posities(speler)) {
      if (label === "K") continue;
      const slot = slots.find((s) => !veld[s.key] && s.label.toUpperCase() !== "K" && s.label.toUpperCase() === label);
      if (slot) {
        veld[slot.key] = speler.id;
        gebruikt.add(speler.id);
        break;
      }
    }
  }

  // Restplekken: hoogst gerangschikte overgebleven spelers, positie maakt
  // dan niet meer uit.
  for (const slot of slots) {
    if (slot.label.toUpperCase() === "K" || veld[slot.key]) continue;
    const volgende = ranked.find((s) => !gebruikt.has(s.id));
    if (volgende) {
      veld[slot.key] = volgende.id;
      gebruikt.add(volgende.id);
    }
  }

  // Bank: de rest, in dezelfde volgorde — dat is meteen de wisselvolgorde
  // (eerste in de lijst = wissel 1, heeft het meeste recht om in te vallen).
  const bank = ranked.filter((s) => !gebruikt.has(s.id)).map((s) => s.id);
  return { veld, bank };
}
