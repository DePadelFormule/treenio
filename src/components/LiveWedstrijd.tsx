"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { logEvent, verwijderEvent } from "@/app/staf/wedstrijd/[id]/live/actions";

interface SpelerKort { id: string; naam: string; rugnummer: number | null; }
interface Ev { id: string; type: string; speler_id: string | null; minuut: number; }

interface Props {
  wedstrijdId: string;
  kop: string;
  spelers: SpelerKort[];
  basisIds: string[];
  bankIds: string[];
  beginEvents: Ev[];
}

const LABEL: Record<string, string> = {
  goal: "⚽ Goal", assist: "🅰️ Assist", geel: "🟨 Geel", rood: "🟥 Rood",
  wissel_in: "🔺 Wissel in", wissel_uit: "🔻 Wissel uit", tegengoal: "⚽ Tegen", einde: "⏱️ Einde",
};

export function LiveWedstrijd({ wedstrijdId, kop, spelers, basisIds, bankIds, beginEvents }: Props) {
  const [events, setEvents] = useState<Ev[]>(beginEvents);
  const [picker, setPicker] = useState<{ type: string; groep: "selectie" | "veld" | "bank" } | null>(null);
  const [melding, setMelding] = useState<string | null>(null);
  const [, start] = useTransition();

  const naamVan = useMemo(() => {
    const m = new Map<string, SpelerKort>();
    for (const s of spelers) m.set(s.id, s);
    return m;
  }, [spelers]);

  const selectieIds = basisIds.length || bankIds.length ? [...new Set([...basisIds, ...bankIds])] : spelers.map((s) => s.id);

  // ---- Timer (bewaard in de browser) ----
  const TKEY = `treenio-timer-${wedstrijdId}`;
  const timer = useRef<{ base: number; startedAt: number | null }>({ base: 0, startedAt: null });
  const [, setTick] = useState(0);
  useEffect(() => {
    try { const raw = localStorage.getItem(TKEY); if (raw) timer.current = JSON.parse(raw); } catch {}
    const iv = setInterval(() => setTick((t) => t + 1), 500);
    return () => clearInterval(iv);
  }, [TKEY]);
  function bewaarTimer() { try { localStorage.setItem(TKEY, JSON.stringify(timer.current)); } catch {} }
  function elapsed() { const t = timer.current; return Math.floor(t.base + (t.startedAt ? (Date.now() - t.startedAt) / 1000 : 0)); }
  const running = timer.current.startedAt !== null;
  function startPauze() {
    const t = timer.current;
    if (t.startedAt === null) t.startedAt = Date.now();
    else { t.base += (Date.now() - t.startedAt) / 1000; t.startedAt = null; }
    bewaarTimer(); setTick((x) => x + 1);
  }
  function resetTimer() { if (!confirm("Timer op 0 zetten?")) return; timer.current = { base: 0, startedAt: null }; bewaarTimer(); setTick((x) => x + 1); }

  const sec = elapsed();
  const minuut = Math.floor(sec / 60);
  const mmss = `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;

  // ---- Wie staat er op het veld ----
  const onField = useMemo(() => {
    const set = new Set(basisIds);
    [...events].sort((a, b) => a.minuut - b.minuut).forEach((e) => {
      if (e.type === "wissel_in" && e.speler_id) set.add(e.speler_id);
      if ((e.type === "wissel_uit" || e.type === "rood") && e.speler_id) set.delete(e.speler_id);
    });
    return set;
  }, [events, basisIds]);

  const goalsVoor = events.filter((e) => e.type === "goal").length;
  const goalsTegen = events.filter((e) => e.type === "tegengoal").length;

  function log(type: string, speler_id: string | null) {
    const m = minuut;
    setMelding(null);
    start(async () => {
      const res = await logEvent({ wedstrijd_id: wedstrijdId, speler_id, type, minuut: m });
      if (res.ok && res.id) setEvents((e) => [...e, { id: res.id!, type, speler_id, minuut: m }]);
      else setMelding("Kon niet opslaan. Is de wedstrijd_events-tabel al in Supabase aangemaakt?");
    });
  }
  function wis(id: string) {
    setEvents((e) => e.filter((x) => x.id !== id));
    start(() => { void verwijderEvent(id, wedstrijdId); });
  }

  function open(type: string) {
    if (type === "tegengoal") return log("tegengoal", null);
    if (type === "einde") { if (running) startPauze(); return log("einde", null); }
    const groep = type === "wissel_uit" || type === "rood" || type === "geel" ? "veld" : type === "wissel_in" ? "bank" : "selectie";
    setPicker({ type, groep });
  }

  function pickerSpelers() {
    if (!picker) return [];
    if (picker.groep === "veld") return spelers.filter((s) => onField.has(s.id));
    if (picker.groep === "bank") return spelers.filter((s) => selectieIds.includes(s.id) && !onField.has(s.id));
    return spelers.filter((s) => selectieIds.includes(s.id));
  }

  const tijdlijn = [...events].filter((e) => e.type !== "einde").sort((a, b) => b.minuut - a.minuut);

  return (
    <div>
      <p className="mb-3 text-sm text-neutral-500">{kop}</p>

      {melding && (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{melding}</p>
      )}

      {/* Timer + score */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-neutral-900 p-4 text-white">
        <div>
          <div className="text-xs uppercase tracking-wide text-white/50">Tijd</div>
          <div className="text-4xl font-black tabular-nums">{mmss}</div>
          <div className="text-xs text-white/60">{minuut}&apos; · {running ? "loopt" : "gepauzeerd"}</div>
        </div>
        <div className="text-center">
          <div className="text-xs uppercase tracking-wide text-white/50">Stand</div>
          <div className="text-4xl font-black tabular-nums">{goalsVoor} - {goalsTegen}</div>
          <div className="text-xs text-white/60">wij - tegen</div>
        </div>
        <div className="flex gap-2">
          <button onClick={startPauze} className={`rounded-xl px-4 py-3 text-sm font-bold ${running ? "bg-amber-500" : "bg-green-600"}`}>
            {running ? "⏸ Pauze" : sec > 0 ? "▶ Hervat" : "▶ Aftrap"}
          </button>
          <button onClick={resetTimer} className="rounded-xl bg-white/10 px-3 py-3 text-sm font-semibold">↺</button>
        </div>
      </div>

      {/* Event-knoppen */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <button onClick={() => open("goal")} className="rounded-xl bg-sparta px-4 py-4 text-base font-bold text-white">⚽ Goal</button>
        <button onClick={() => open("assist")} className="rounded-xl bg-sparta px-4 py-4 text-base font-bold text-white">🅰️ Assist</button>
        <button onClick={() => open("geel")} className="rounded-xl bg-amber-400 px-4 py-4 text-base font-bold text-neutral-900">🟨 Geel</button>
        <button onClick={() => open("rood")} className="rounded-xl bg-red-600 px-4 py-4 text-base font-bold text-white">🟥 Rood</button>
        <button onClick={() => open("wissel_uit")} className="rounded-xl bg-neutral-700 px-4 py-4 text-base font-bold text-white">🔻 Wissel uit</button>
        <button onClick={() => open("wissel_in")} className="rounded-xl bg-neutral-700 px-4 py-4 text-base font-bold text-white">🔺 Wissel in</button>
        <button onClick={() => open("tegengoal")} className="rounded-xl bg-neutral-300 px-4 py-4 text-base font-bold text-neutral-800">⚽ Tegen</button>
        <button onClick={() => open("einde")} className="rounded-xl border-2 border-neutral-400 px-4 py-4 text-base font-bold text-neutral-700">⏱️ Einde</button>
      </div>

      {/* Tijdlijn */}
      <h2 className="mt-6 mb-2 text-sm font-semibold text-neutral-700">Verloop</h2>
      {tijdlijn.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 p-4 text-center text-sm text-neutral-400">
          Nog niets genoteerd. Start de timer bij de aftrap en tik de gebeurtenissen.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {tijdlijn.map((e) => (
            <li key={e.id} className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-2.5 text-sm">
              <span className="w-10 text-center font-bold tabular-nums text-sparta">{e.minuut}&apos;</span>
              <span className="flex-1">
                {LABEL[e.type] ?? e.type}
                {e.speler_id && <span className="ml-1 font-medium text-neutral-800">· {naamVan.get(e.speler_id)?.naam ?? "?"}</span>}
              </span>
              <button onClick={() => wis(e.id)} className="text-xs text-neutral-400 hover:text-red-600">wis</button>
            </li>
          ))}
        </ul>
      )}

      {/* Spelerkiezer */}
      {picker && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setPicker(null)} />
          <div className="fixed inset-x-0 bottom-0 z-50 max-h-[75vh] overflow-auto rounded-t-2xl border-t border-neutral-200 bg-white p-4 shadow-2xl">
            <div className="mx-auto max-w-md">
              <p className="mb-3 text-sm font-semibold text-neutral-700">
                {LABEL[picker.type]} · {minuut}&apos; — kies speler
              </p>
              <div className="grid grid-cols-3 gap-2">
                {pickerSpelers().map((s) => (
                  <button
                    key={s.id}
                    onClick={() => { log(picker.type, s.id); setPicker(null); }}
                    className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-3 text-left text-sm"
                  >
                    <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-sparta/10 text-xs font-bold text-sparta">{s.rugnummer ?? "–"}</span>
                    <span className="truncate">{s.naam.split(" ")[0]}</span>
                  </button>
                ))}
                {pickerSpelers().length === 0 && <p className="col-span-3 text-sm text-neutral-400">Geen spelers beschikbaar voor deze actie.</p>}
              </div>
              <button onClick={() => setPicker(null)} className="mt-3 w-full rounded-lg bg-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700">Annuleren</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
