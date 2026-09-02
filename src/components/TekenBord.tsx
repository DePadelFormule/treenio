"use client";

// Schil om het tekenbord: laadt de situatie (oud of nieuw formaat), houdt
// het veldtype bij en slaat op. Het tekenen zelf zit in PlayEditor.

import Link from "next/link";
import { useState } from "react";
import { Save, Printer } from "lucide-react";
import { bewaarSpelsituatie } from "@/app/staf/spelsituaties/actions";
import PlayEditor from "@/components/tactiek/PlayEditor";
import { naarPlayData } from "@/lib/tactiek/vanBordData";
import type { PlayData } from "@/lib/tactiek/types";

interface Props {
  id: string;
  beginTitel: string;
  beginUitleg: string | null;
  beginHalfVeld: boolean;
  beginData: unknown;
}

export function TekenBord({ id, beginTitel, beginUitleg, beginHalfVeld, beginData }: Props) {
  const [play, setPlay] = useState<PlayData>(() => naarPlayData(beginData, beginHalfVeld, beginTitel, beginUitleg ?? ""));
  const [halfVeld, setHalfVeld] = useState(beginHalfVeld);
  const [bezig, setBezig] = useState(false);
  const [bewaard, setBewaard] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  function wijzig(data: PlayData) {
    setPlay(data);
    setBewaard(false);
  }

  async function opslaan() {
    setBezig(true);
    setFout(null);
    const res = await bewaarSpelsituatie({
      id,
      titel: play.title.trim() || beginTitel,
      uitleg: play.description.trim() || null,
      half_veld: halfVeld,
      data: play,
    });
    setBezig(false);
    setBewaard(res.ok);
    if (!res.ok) setFout(res.error ?? "Opslaan mislukt.");
  }

  const knop = "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm transition-colors disabled:opacity-40";

  return (
    <div className="space-y-2">
      <div className="h-[80vh] min-h-[560px] rounded-2xl overflow-hidden border border-neutral-800">
        <PlayEditor
          value={play}
          onChange={wijzig}
          veld={halfVeld ? "half" : "heel"}
          toolbarStart={({ busy }) => (
            <>
              <button type="button" onClick={opslaan} disabled={busy || bezig} className={`${knop} bg-sparta text-white hover:bg-sparta-dark font-semibold`}>
                <Save className="w-4 h-4" /> {bezig ? "Opslaan…" : "Opslaan"}
              </button>
              {bewaard && <span className="text-xs text-green-400 flex-shrink-0">✓ Opgeslagen</span>}
              {fout && <span className="text-xs text-red-400 flex-shrink-0">{fout}</span>}
              <label className="flex items-center gap-1.5 text-xs text-neutral-300 px-1">
                <input
                  type="checkbox"
                  checked={halfVeld}
                  disabled={busy}
                  onChange={(e) => { setHalfVeld(e.target.checked); setBewaard(false); }}
                  className="accent-sparta"
                />
                half veld
              </label>
              <Link href={`/staf/spelsituaties/${id}/print`} className={`${knop} text-neutral-300 hover:bg-neutral-800 hover:text-white`} title="Alle stappen als PDF">
                <Printer className="w-4 h-4" /> PDF
              </Link>
            </>
          )}
        />
      </div>
      <p className="text-xs text-neutral-400">
        Tip: zet magneetjes neer, maak met + een nieuw frame en versleep ze om de beweging te tonen. Een frame met een stap-tekst wordt een ondertitel.
      </p>
    </div>
  );
}
