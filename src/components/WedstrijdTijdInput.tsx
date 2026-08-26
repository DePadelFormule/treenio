"use client";

import { useState, useTransition } from "react";
import { setWedstrijdTijd } from "@/app/staf/wedstrijden/actions";

// Klein tijdveldje per wedstrijd in de lijst. Slaat op zodra je een tijd kiest
// of het veld verlaat.
export function WedstrijdTijdInput({ id, begin }: { id: string; begin: string }) {
  const [tijd, setTijd] = useState(begin);
  const [, start] = useTransition();

  function bewaar(waarde: string) {
    setTijd(waarde);
    start(() => { void setWedstrijdTijd(id, waarde); });
  }

  return (
    <input
      type="time"
      value={tijd}
      onChange={(e) => bewaar(e.target.value)}
      title="Aanvangstijd"
      className="rounded-lg border border-neutral-300 px-2 py-1 text-xs text-neutral-700"
    />
  );
}
