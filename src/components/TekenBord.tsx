"use client";

import { useEffect, useRef, useState } from "react";
import { bewaarSpelsituatie } from "@/app/staf/spelsituaties/actions";
import type { BordData, BordFrame, BordTeam, BordToken } from "@/lib/types/database";

interface Props {
  id: string;
  beginTitel: string;
  beginUitleg: string | null;
  beginHalfVeld: boolean;
  beginData: BordData;
}

function nieuwId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `t${Math.floor(Math.random() * 1e9)}`;
  }
}

function clamp(v: number) {
  return Math.max(2, Math.min(98, v));
}

export function TekenBord({ id, beginTitel, beginUitleg, beginHalfVeld, beginData }: Props) {
  const [titel, setTitel] = useState(beginTitel);
  const [uitleg, setUitleg] = useState(beginUitleg ?? "");
  const [halfVeld, setHalfVeld] = useState(beginHalfVeld);
  const [tokens, setTokens] = useState<BordToken[]>(beginData.tokens ?? []);
  const [frames, setFrames] = useState<BordFrame[]>(
    beginData.frames && beginData.frames.length ? beginData.frames : [{}],
  );
  const [stap, setStap] = useState(0);
  const [speelt, setSpeelt] = useState(false);
  const [loop, setLoop] = useState(false);
  const [interp, setInterp] = useState<BordFrame | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [bezig, setBezig] = useState(false);
  const [bewaard, setBewaard] = useState(false);

  const veldRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const dragId = useRef<string | null>(null);

  const huidigeFrame = frames[stap] ?? {};
  const posBron = speelt && interp ? interp : huidigeFrame;

  // ---- tokens beheren -------------------------------------------------------
  function voegToe(team: BordTeam) {
    const tid = nieuwId();
    const nummer = tokens.filter((t) => t.team === team).length + 1;
    const label = team === "bal" ? "" : String(nummer);
    const startPos = { x: 50, y: team === "eigen" ? 70 : team === "tegenstander" ? 35 : 50 };
    setTokens((t) => [...t, { id: tid, team, label }]);
    setFrames((fr) => fr.map((f) => ({ ...f, [tid]: { ...startPos } })));
    setBewaard(false);
  }

  function verwijderToken(tid: string) {
    setTokens((t) => t.filter((x) => x.id !== tid));
    setFrames((fr) => fr.map((f) => {
      const n = { ...f };
      delete n[tid];
      return n;
    }));
    setBewaard(false);
  }

  // ---- stappen --------------------------------------------------------------
  function voegStapToe() {
    setFrames((fr) => {
      const kopie = { ...(fr[stap] ?? {}) };
      const next = [...fr];
      next.splice(stap + 1, 0, kopie);
      return next;
    });
    setStap((s) => s + 1);
    setBewaard(false);
  }

  function verwijderStap() {
    if (frames.length <= 1) return;
    setFrames((fr) => fr.filter((_, i) => i !== stap));
    setStap((s) => Math.max(0, s - 1));
    setBewaard(false);
  }

  // ---- slepen ---------------------------------------------------------------
  function pointerPct(clientX: number, clientY: number) {
    const rect = veldRef.current!.getBoundingClientRect();
    return {
      x: clamp(((clientX - rect.left) / rect.width) * 100),
      y: clamp(((clientY - rect.top) / rect.height) * 100),
    };
  }

  function onTokenDown(e: React.PointerEvent, tid: string) {
    if (speelt) return;
    e.preventDefault();
    dragId.current = tid;
    (e.target as Element).setPointerCapture(e.pointerId);
  }
  function onTokenMove(e: React.PointerEvent, tid: string) {
    if (dragId.current !== tid) return;
    const p = pointerPct(e.clientX, e.clientY);
    setFrames((fr) => fr.map((f, i) => (i === stap ? { ...f, [tid]: p } : f)));
    setBewaard(false);
  }
  function onTokenUp(e: React.PointerEvent) {
    dragId.current = null;
    try { (e.target as Element).releasePointerCapture(e.pointerId); } catch {}
  }

  // ---- afspelen -------------------------------------------------------------
  function speel() {
    if (frames.length < 2) return;
    setSpeelt(true);
    const perStap = 900;
    const total = (frames.length - 1) * perStap;
    let start: number | null = null;
    const tick = (ts: number) => {
      if (start === null) start = ts;
      let elapsed = ts - start;
      if (elapsed >= total) {
        if (loop) { start = ts; elapsed = 0; }
        else { stop(); setStap(frames.length - 1); return; }
      }
      const p = elapsed / perStap;
      const seg = Math.min(Math.floor(p), frames.length - 2);
      const t = p - seg;
      const a = frames[seg], b = frames[seg + 1];
      const tussen: BordFrame = {};
      for (const tok of tokens) {
        const pa = a[tok.id] ?? b[tok.id] ?? { x: 50, y: 50 };
        const pb = b[tok.id] ?? pa;
        tussen[tok.id] = { x: pa.x + (pb.x - pa.x) * t, y: pa.y + (pb.y - pa.y) * t };
      }
      setInterp(tussen);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }
  function stop() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    setSpeelt(false);
    setInterp(null);
  }
  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  // ---- opslaan --------------------------------------------------------------
  async function opslaan() {
    setBezig(true);
    const res = await bewaarSpelsituatie({
      id, titel, uitleg: uitleg || null, half_veld: halfVeld,
      data: { tokens, frames },
    });
    setBezig(false);
    setBewaard(res.ok);
  }

  // ---- render ---------------------------------------------------------------
  const veld = (
    <div
      ref={veldRef}
      className="relative w-full overflow-hidden rounded-2xl border-2 border-white/40 bg-gradient-to-b from-green-700 to-green-800 touch-none select-none"
      style={{ aspectRatio: halfVeld ? "3 / 4" : "2 / 3" }}
    >
      {/* lijnen */}
      <div className="pointer-events-none absolute inset-3 rounded-lg border-2 border-white/30" />
      {halfVeld ? (
        <>
          <div className="pointer-events-none absolute left-1/4 right-1/4 top-3 h-16 border-2 border-white/30" />
          <div className="pointer-events-none absolute bottom-3 left-3 right-3 border-t-2 border-white/30" />
        </>
      ) : (
        <>
          <div className="pointer-events-none absolute left-3 right-3 top-1/2 -translate-y-1/2 border-t-2 border-white/30" />
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/30" />
          <div className="pointer-events-none absolute left-1/4 right-1/4 top-3 h-12 border-2 border-white/30" />
          <div className="pointer-events-none absolute bottom-3 left-1/4 right-1/4 h-12 border-2 border-white/30" />
        </>
      )}

      {tokens.map((tok) => {
        const pos = posBron[tok.id] ?? { x: 50, y: 50 };
        const kleur = tok.team === "eigen" ? "bg-sparta text-white" : tok.team === "tegenstander" ? "bg-neutral-900 text-white" : "bg-white text-neutral-900";
        return (
          <div
            key={tok.id}
            onPointerDown={(e) => onTokenDown(e, tok.id)}
            onPointerMove={(e) => onTokenMove(e, tok.id)}
            onPointerUp={onTokenUp}
            className="absolute -translate-x-1/2 -translate-y-1/2 touch-none"
            style={{ left: `${pos.x}%`, top: `${pos.y}%`, cursor: speelt ? "default" : "grab" }}
          >
            <div className={`flex items-center justify-center rounded-full font-bold shadow ${kleur} ${tok.team === "bal" ? "h-6 w-6 text-xs" : "h-9 w-9 text-sm"}`}>
              {tok.team === "bal" ? "⚽" : tok.label}
            </div>
            {!speelt && (
              <button
                type="button"
                onPointerDown={(e) => { e.stopPropagation(); }}
                onClick={() => verwijderToken(tok.id)}
                className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-bold text-red-600 shadow"
                aria-label="verwijder"
              >×</button>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className={fullscreen ? "fixed inset-0 z-50 overflow-auto bg-neutral-900 p-3" : ""}>
      {/* Titel/uitleg alleen buiten fullscreen */}
      {!fullscreen && (
        <div className="mb-4 space-y-2">
          <input
            value={titel}
            onChange={(e) => { setTitel(e.target.value); setBewaard(false); }}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-lg font-bold"
            placeholder="Titel van de situatie"
          />
          <textarea
            value={uitleg}
            onChange={(e) => { setUitleg(e.target.value); setBewaard(false); }}
            rows={2}
            placeholder="Korte uitleg (optioneel)"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
      )}

      <div className={fullscreen ? "mx-auto max-w-md" : ""}>
        {veld}
      </div>

      {/* Knoppenbalk */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {!speelt && (
          <>
            <button type="button" onClick={() => voegToe("eigen")} className="rounded-lg bg-sparta px-3 py-1.5 text-sm font-semibold text-white">+ eigen</button>
            <button type="button" onClick={() => voegToe("tegenstander")} className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-semibold text-white">+ tegenstander</button>
            <button type="button" onClick={() => voegToe("bal")} className="rounded-lg border border-neutral-400 bg-white px-3 py-1.5 text-sm font-semibold text-neutral-700">+ bal</button>
          </>
        )}
        <div className="ml-auto flex items-center gap-2">
          {!speelt ? (
            <button type="button" onClick={speel} disabled={frames.length < 2} className="rounded-lg bg-green-700 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-40">▶ Afspelen</button>
          ) : (
            <button type="button" onClick={stop} className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white">■ Stop</button>
          )}
          <button type="button" onClick={() => setLoop((l) => !l)} className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${loop ? "bg-sparta text-white" : "bg-neutral-200 text-neutral-700"}`} title="Herhalen">↻</button>
          <button type="button" onClick={() => setFullscreen((f) => !f)} className="rounded-lg bg-neutral-700 px-3 py-1.5 text-sm font-semibold text-white">{fullscreen ? "Sluiten" : "⛶ Presentatie"}</button>
        </div>
      </div>

      {/* Stappen */}
      {!speelt && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-neutral-100 p-2">
          <button type="button" onClick={() => setStap((s) => Math.max(0, s - 1))} disabled={stap === 0} className="rounded px-2 py-1 text-sm disabled:opacity-30">◀</button>
          <span className="text-sm font-medium text-neutral-700">Stap {stap + 1} / {frames.length}</span>
          <button type="button" onClick={() => setStap((s) => Math.min(frames.length - 1, s + 1))} disabled={stap === frames.length - 1} className="rounded px-2 py-1 text-sm disabled:opacity-30">▶</button>
          <button type="button" onClick={voegStapToe} className="rounded-lg bg-sparta px-3 py-1 text-sm font-semibold text-white">+ stap</button>
          <button type="button" onClick={verwijderStap} disabled={frames.length <= 1} className="rounded-lg bg-neutral-200 px-3 py-1 text-sm font-semibold text-neutral-700 disabled:opacity-30">stap wissen</button>
          {!fullscreen && (
            <label className="ml-2 flex items-center gap-1 text-sm text-neutral-600">
              <input type="checkbox" checked={halfVeld} onChange={(e) => { setHalfVeld(e.target.checked); setBewaard(false); }} />
              half veld
            </label>
          )}
        </div>
      )}

      {/* Opslaan */}
      {!fullscreen && (
        <div className="mt-4 flex items-center gap-3">
          <button type="button" onClick={opslaan} disabled={bezig} className="rounded-lg bg-sparta px-5 py-2 text-sm font-semibold text-white hover:bg-sparta-dark disabled:opacity-40">
            {bezig ? "Opslaan…" : "Opslaan"}
          </button>
          {bewaard && <span className="text-sm text-sparta">✓ Opgeslagen</span>}
          <span className="text-xs text-neutral-400">Tip: sleep de magneetjes; maak met “+ stap” een beweging en speel 'm af.</span>
        </div>
      )}
    </div>
  );
}
