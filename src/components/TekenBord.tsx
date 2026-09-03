"use client";

// Schil om het tekenbord: laadt de situatie (oud of nieuw formaat), houdt
// het veldtype bij en slaat op. Het tekenen zelf zit in PlayEditor.
//
// Opslaan gaat automatisch: een paar seconden na de laatste wijziging, en
// meteen als het tabblad naar de achtergrond gaat. Zo raak je niets kwijt
// als je terug naar het dashboard klikt.

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Save, Printer } from "lucide-react";
import { bewaarSpelsituatie } from "@/app/staf/spelsituaties/actions";
import PlayEditor from "@/components/tactiek/PlayEditor";
import { naarPlayData } from "@/lib/tactiek/vanBordData";
import type { PlayData } from "@/lib/tactiek/types";
import { CATEGORIEEN, alsCategorie, type Categorie } from "@/lib/tactiek/categorieen";

/** Wachttijd na de laatste wijziging voordat er automatisch wordt opgeslagen. */
const AUTOSAVE_MS = 3000;

interface Props {
  id: string;
  beginTitel: string;
  beginUitleg: string | null;
  beginHalfVeld: boolean;
  beginCategorie: string;
  beginData: unknown;
}

type Stand = "schoon" | "vuil" | "bezig" | "fout";

export function TekenBord({ id, beginTitel, beginUitleg, beginHalfVeld, beginCategorie, beginData }: Props) {
  const [play, setPlay] = useState<PlayData>(() => naarPlayData(beginData, beginHalfVeld, beginTitel, beginUitleg ?? ""));
  const [halfVeld, setHalfVeld] = useState(beginHalfVeld);
  const [categorie, setCategorie] = useState<Categorie>(() => alsCategorie(beginCategorie));
  const [stand, setStand] = useState<Stand>("schoon");
  const [laatstOpgeslagen, setLaatstOpgeslagen] = useState<string | null>(null);
  const [fout, setFout] = useState<string | null>(null);

  // Wat er nu op het bord staat, altijd actueel, ook binnen een timer.
  const huidig = useRef({ play, halfVeld, categorie });
  huidig.current = { play, halfVeld, categorie };
  const vuil = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const opslaan = useCallback(async () => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    const { play: p, halfVeld: hv, categorie: cat } = huidig.current;
    setStand("bezig");
    setFout(null);
    const res = await bewaarSpelsituatie({
      id,
      titel: p.title.trim() || beginTitel,
      uitleg: p.description.trim() || null,
      half_veld: hv,
      categorie: cat,
      data: p,
    });
    if (!res.ok) {
      setStand("fout");
      setFout(res.error ?? "Opslaan mislukt.");
      return;
    }
    // Alleen schoon als er ondertussen niets meer veranderd is.
    if (huidig.current.play === p && huidig.current.halfVeld === hv && huidig.current.categorie === cat) {
      vuil.current = false;
      setStand("schoon");
    } else {
      setStand("vuil");
    }
    setLaatstOpgeslagen(new Date().toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" }));
  }, [id, beginTitel]);

  /** Markeert het bord als gewijzigd en zet de autosave-timer opnieuw. */
  const markeerVuil = useCallback(() => {
    vuil.current = true;
    setStand("vuil");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { void opslaan(); }, AUTOSAVE_MS);
  }, [opslaan]);

  function wijzig(data: PlayData) {
    setPlay(data);
    markeerVuil();
  }

  function wisselVeld(half: boolean) {
    setHalfVeld(half);
    markeerVuil();
  }

  function wisselCategorie(waarde: string) {
    setCategorie(alsCategorie(waarde));
    markeerVuil();
  }

  // Tabblad naar de achtergrond of dicht: meteen opslaan, en bij sluiten met
  // niet-opgeslagen werk eerst waarschuwen.
  useEffect(() => {
    const onZichtbaarheid = () => {
      if (document.visibilityState === "hidden" && vuil.current) void opslaan();
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!vuil.current) return;
      e.preventDefault();
    };
    document.addEventListener("visibilitychange", onZichtbaarheid);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", onZichtbaarheid);
      window.removeEventListener("beforeunload", onBeforeUnload);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [opslaan]);

  const knop = "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm transition-colors disabled:opacity-40";

  const standTekst = stand === "bezig"
    ? "Opslaan…"
    : stand === "vuil"
      ? "Wijzigingen worden zo opgeslagen"
      : stand === "fout"
        ? fout ?? "Opslaan mislukt"
        : laatstOpgeslagen
          ? `Opgeslagen om ${laatstOpgeslagen}`
          : null;

  return (
    <div className="space-y-2">
      <div className="h-[80vh] min-h-[560px] rounded-2xl overflow-hidden border border-neutral-800">
        <PlayEditor
          value={play}
          onChange={wijzig}
          veld={halfVeld ? "half" : "heel"}
          toolbarStart={({ busy }) => (
            <>
              <button
                type="button"
                onClick={() => void opslaan()}
                disabled={busy || stand === "bezig"}
                className={`${knop} font-semibold ${stand === "vuil" ? "bg-sparta text-white hover:bg-sparta-dark" : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"}`}
                title="Nu opslaan (gebeurt ook vanzelf)"
              >
                <Save className="w-4 h-4" /> Opslaan
              </button>
              {standTekst && (
                <span className={`text-xs flex-shrink-0 ${stand === "fout" ? "text-red-400" : stand === "schoon" ? "text-green-400" : "text-neutral-400"}`}>
                  {standTekst}
                </span>
              )}
              <label className="flex items-center gap-1.5 text-xs text-neutral-300 px-1">
                <input
                  type="checkbox"
                  checked={halfVeld}
                  disabled={busy}
                  onChange={(e) => wisselVeld(e.target.checked)}
                  className="accent-sparta"
                />
                half veld
              </label>
              <select
                value={categorie}
                disabled={busy}
                onChange={(e) => wisselCategorie(e.target.value)}
                title="Categorie"
                className="bg-neutral-800 border border-neutral-700 text-white rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-sparta max-w-[11rem]"
              >
                {CATEGORIEEN.map((c) => <option key={c.naam} value={c.naam}>{c.naam}</option>)}
              </select>
              <Link href={`/staf/spelsituaties/${id}/print`} className={`${knop} text-neutral-300 hover:bg-neutral-800 hover:text-white`} title="Alle stappen als PDF">
                <Printer className="w-4 h-4" /> PDF
              </Link>
            </>
          )}
        />
      </div>
      <p className="text-xs text-neutral-400">
        Tip: zet magneetjes neer, maak met + een nieuw frame en versleep ze om de beweging te tonen. Een frame met een stap-tekst wordt een ondertitel. Opslaan gaat vanzelf.
      </p>
    </div>
  );
}
