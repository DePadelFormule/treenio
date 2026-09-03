"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { herstelWeek, zetDuo, zetGedaan, zetVakantie } from "@/app/staf/materiaaldienst/actions";
import { trainingsdagen, voornaam, weekLabel, type DienstSpeler, type DienstWeek } from "@/lib/materiaaldienst";

interface Props {
  weken: DienstWeek[];
  spelers: DienstSpeler[];
  /** De maandag van de week van vandaag. */
  huidigeWeek: string;
}

export function MateriaaldienstLijst({ weken, spelers, huidigeWeek }: Props) {
  const router = useRouter();
  const [bezig, start] = useTransition();
  const [toonEerder, setToonEerder] = useState(false);
  const [wijzig, setWijzig] = useState<{ week: string; a: string; b: string } | null>(null);

  const eerder = weken.filter((w) => w.week_start < huidigeWeek);
  const zichtbaar = toonEerder ? weken : weken.filter((w) => w.week_start >= huidigeWeek);

  function doe(actie: () => Promise<{ ok: boolean }>) {
    start(async () => {
      const res = await actie();
      if (!res.ok) alert("Dat is niet gelukt.");
      router.refresh();
    });
  }

  return (
    <div>
      {eerder.length > 0 && (
        <button type="button" onClick={() => setToonEerder((v) => !v)} className="mb-2 text-xs font-semibold text-neutral-500 hover:text-sparta">
          {toonEerder ? "Eerdere weken verbergen" : `Eerdere weken tonen (${eerder.length})`}
        </button>
      )}

      <ul className="divide-y divide-neutral-100 overflow-hidden rounded-xl border border-neutral-200 bg-white">
        {zichtbaar.map((w) => {
          const nu = w.week_start === huidigeWeek;
          const voorbij = w.week_start < huidigeWeek;
          return (
            <li key={w.week_start} className={`flex flex-wrap items-center gap-3 px-4 py-3 ${nu ? "bg-red-50" : voorbij ? "bg-neutral-50 text-neutral-400" : ""}`}>
              <div className="w-28 shrink-0">
                <p className={`text-sm font-semibold ${nu ? "text-sparta" : ""}`}>{weekLabel(w.week_start)}</p>
                <p className="text-[11px] text-neutral-400">{trainingsdagen(w.week_start)}</p>
              </div>

              <div className="min-w-0 flex-1">
                {w.vakantie ? (
                  <p className="text-sm italic text-neutral-400">Vakantie, geen dienst</p>
                ) : w.duo ? (
                  <p className={`text-base font-bold ${w.gedaan ? "text-green-700 line-through decoration-2" : nu ? "text-sparta" : "text-neutral-800"}`}>
                    {voornaam(w.duo[0].naam)} + {voornaam(w.duo[1].naam)}
                    <span className="ml-2 text-xs font-normal text-neutral-400">
                      {w.duo[0].naam} en {w.duo[1].naam}{w.handmatig ? " · handmatig" : ""}
                    </span>
                  </p>
                ) : (
                  <p className="text-sm text-neutral-400">Geen spelers</p>
                )}
                {nu && !w.vakantie && <p className="text-xs font-semibold text-sparta">Deze week</p>}
              </div>

              <div className="flex shrink-0 items-center gap-2 text-xs">
                {!w.vakantie && w.duo && (
                  <label className="flex items-center gap-1.5 font-semibold text-neutral-600">
                    <input
                      type="checkbox"
                      checked={w.gedaan}
                      disabled={bezig}
                      onChange={(e) => doe(() => zetGedaan(w.week_start, e.target.checked, w.duo![0].id, w.duo![1].id))}
                      className="h-4 w-4 accent-green-600"
                    />
                    gedaan
                  </label>
                )}
                {!w.gedaan && (
                  <button
                    type="button"
                    disabled={bezig}
                    onClick={() => doe(() => zetVakantie(w.week_start, !w.vakantie))}
                    className={`rounded px-2 py-1 font-semibold ${w.vakantie ? "bg-sky-100 text-sky-800" : "text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"}`}
                  >
                    {w.vakantie ? "Vakantie uit" : "Vakantie"}
                  </button>
                )}
                {!w.vakantie && !w.gedaan && w.duo && (
                  <button
                    type="button"
                    disabled={bezig}
                    onClick={() => setWijzig({ week: w.week_start, a: w.duo![0].id, b: w.duo![1].id })}
                    className="rounded px-2 py-1 font-semibold text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                  >
                    Wissel
                  </button>
                )}
                {w.bewaard && (w.handmatig || w.vakantie) && !w.gedaan && (
                  <button
                    type="button"
                    disabled={bezig}
                    onClick={() => doe(() => herstelWeek(w.week_start))}
                    className="rounded px-2 py-1 font-semibold text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                    title="Terug naar het automatische rooster"
                  >
                    Automatisch
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-2 text-xs text-neutral-400">
        Een afgevinkte week ligt vast; het rooster telt daarna verder. Wissel je een duo, dan schuiven de weken erna mee.
      </p>

      {wijzig && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setWijzig(null)} />
          <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t border-neutral-200 bg-white p-4 shadow-2xl">
            <div className="mx-auto max-w-md">
              <p className="mb-3 text-sm font-semibold text-neutral-700">Ander duo voor {weekLabel(wijzig.week)}</p>
              <div className="mb-3 grid grid-cols-2 gap-2">
                {(["a", "b"] as const).map((kant) => (
                  <select
                    key={kant}
                    value={wijzig[kant]}
                    onChange={(e) => setWijzig({ ...wijzig, [kant]: e.target.value })}
                    className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                  >
                    {spelers.map((s) => <option key={s.id} value={s.id}>{s.naam}</option>)}
                  </select>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setWijzig(null)} className="rounded-lg bg-neutral-200 px-4 py-3 text-sm font-semibold text-neutral-700">Annuleren</button>
                <button
                  type="button"
                  disabled={bezig || wijzig.a === wijzig.b}
                  onClick={() => { const k = wijzig; setWijzig(null); doe(() => zetDuo(k.week, k.a, k.b)); }}
                  className="rounded-lg bg-sparta px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Opslaan
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
