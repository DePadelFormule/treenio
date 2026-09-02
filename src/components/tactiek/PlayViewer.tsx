'use client'

/**
 * Speelt een spelsituatie af zonder het tekenbord eromheen: kijken,
 * pauzeren, terugspoelen en per stap zien wat er gebeurt. PlayPreview is
 * het stilstaande beeld van één frame, voor het printbare storyboard.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Play, Pause, RotateCcw, Footprints, Circle as BallIcon } from 'lucide-react'
import type { AnimPos, PlayData } from '@/lib/tactiek/types'
import { isMarker } from '@/lib/tactiek/types'
import { kijkLayout, toCanvasSpace, type BordLayout, type VeldSoort } from '@/lib/tactiek/veld'
import {
  bareify, computeTimeline, getPositionsAtTime, optionAlphaAt, frameAlphaAt, subtitleAt, type Timeline,
} from '@/lib/tactiek/timeline'
import {
  C_BG, C_BALL, drawArrow, drawBallShadow, drawPitch, drawMotionTrail, drawTBObject,
  drawTextLabel, drawZone, drawSubtitle, drawStroke,
} from '@/lib/tactiek/render'

const SPEEDS = [1, 0.5] as const

function seconden(ms: number) {
  return (ms / 1000).toFixed(1).replace('.', ',')
}

/**
 * Eén beeld van de situatie; data is al in canvas-pixels. Zonder tijdlijn
 * (het stilstaande beeld) tonen we alleen wat bij `frameIndex` hoort.
 */
function tekenBeeld(
  ctx: CanvasRenderingContext2D,
  layout: BordLayout,
  data: PlayData,
  posities: Record<string, AnimPos>,
  looplijnen: boolean,
  balbaan: boolean,
  tijd: number | null,
  timeline: Timeline | null,
  frameIndex = 0,
) {
  const { objects, zones, arrows, texts, frames } = data
  const { canvasW, canvasH, projection } = layout

  ctx.fillStyle = C_BG
  ctx.fillRect(0, 0, canvasW, canvasH)
  drawPitch(ctx, projection)

  const frameAlpha = (fi: number | undefined) =>
    tijd !== null && timeline ? frameAlphaAt(fi, timeline, tijd) : fi === undefined || fi === frameIndex ? 1 : 0
  const withAlpha = (alpha: number, draw: () => void) => {
    if (alpha <= 0) return
    ctx.save(); ctx.globalAlpha = alpha; draw(); ctx.restore()
  }

  for (const z of zones) withAlpha(frameAlpha(z.frameIndex), () => drawZone(ctx, z, false))

  if (frames.length > 1) {
    for (const obj of objects) {
      if (isMarker(obj)) continue
      const aan = obj.type === 'ball' ? balbaan : looplijnen
      if (!aan) continue
      const punten = frames.map(f => f.positions[obj.id]).filter(Boolean) as { x: number; y: number }[]
      drawMotionTrail(ctx, punten, obj.color)
    }
  }

  // Alleen losse pijlen: een pijl die aan een object hangt vertelt hetzelfde
  // als de beweging zelf, en staat in de weg.
  for (const a of arrows) {
    if (a.attachedObjectId) continue
    let alpha = 0.8
    if (a.style === 'option') {
      alpha = tijd !== null && timeline
        ? optionAlphaAt(a, timeline, tijd) * 0.8
        : (a.frameIndex ?? 0) === frameIndex ? 0.8 : 0
    }
    drawArrow(ctx, a, false, alpha)
  }

  for (const obj of objects) {
    const p = posities[obj.id]
    if (p?.shadow) drawBallShadow(ctx, p.shadow.x, p.shadow.y, p.shadow.spread, p.shadow.alpha)
  }
  for (const obj of objects) {
    const p = posities[obj.id]
    if (!p) continue
    drawTBObject(ctx, obj, p.x, p.y, false, false, p.scale ?? 1)
  }
  for (const s of data.strokes ?? []) drawStroke(ctx, s, frameAlpha(s.frameIndex))
  for (const t of texts) withAlpha(frameAlpha(t.frameIndex), () => drawTextLabel(ctx, t, false))

  const subtitle = tijd !== null && timeline ? subtitleAt(frames, timeline, tijd) : (frames[frameIndex]?.text?.trim() ?? '')
  drawSubtitle(ctx, subtitle, canvasW / 2, projection.courtY + projection.courtH - 14, canvasW * 0.7, 26)
}

/** Stilstaand beeld van één frame, met de looplijnen erbij zodat je ook op papier ziet waar iedereen heen gaat. */
export function PlayPreview({ play, veld, frameIndex = 0, className = '' }: {
  play: PlayData
  veld: VeldSoort
  frameIndex?: number
  className?: string
}) {
  const layout = useMemo(() => kijkLayout(veld), [veld])
  const data = useMemo(() => toCanvasSpace(play, layout.projection), [play, layout])
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    tekenBeeld(ctx, layout, data, bareify(data.frames[frameIndex]?.positions ?? {}), true, true, null, null, frameIndex)
  }, [data, layout, frameIndex])

  return (
    <canvas
      ref={canvasRef}
      width={layout.canvasW}
      height={layout.canvasH}
      className={`w-full h-auto rounded-xl ${className}`}
    />
  )
}

export default function PlayViewer({ play, veld }: { play: PlayData; veld: VeldSoort }) {
  const layout = useMemo(() => kijkLayout(veld), [veld])
  const data = useMemo(() => toCanvasSpace(play, layout.projection), [play, layout])
  const { objects, arrows, frames } = data

  const timeline = useMemo(() => computeTimeline(frames, 1), [frames])
  const duur = timeline[timeline.length - 1]?.transitionEnd ?? 0

  const [tijd, setTijd] = useState(0)
  const [speelt, setSpeelt] = useState(false)
  const [snelheid, setSnelheid] = useState<number>(1)
  const [looplijnen, setLooplijnen] = useState(true)
  const [balbaan, setBalbaan] = useState(true)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const stappen = useMemo(
    () => frames
      .map((f, i) => ({ index: i, start: timeline[i]?.start ?? 0, text: f.text?.trim() ?? '' }))
      .filter(s => s.text.length > 0),
    [frames, timeline],
  )
  const actieveStap = useMemo(() => {
    let gevonden = -1
    for (const s of stappen) if (tijd >= s.start - 1) gevonden = s.index
    return gevonden
  }, [stappen, tijd])

  const legenda = useMemo(() => {
    const kleuren = [...new Set(objects.filter(o => o.type === 'player').map(o => o.color))]
    const regels = kleuren.map((kleur, i) => ({ kleur, tekst: kleuren.length > 1 ? `Team ${i + 1}` : 'Spelers' }))
    if (objects.some(o => o.type === 'trainer')) regels.push({ kleur: objects.find(o => o.type === 'trainer')!.color, tekst: 'Trainer' })
    if (objects.some(o => o.type === 'ball')) regels.push({ kleur: C_BALL, tekst: 'Bal, groter is hoger' })
    return regels
  }, [objects])

  useEffect(() => {
    if (!speelt || duur <= 0) return
    let raf = 0
    let vorige = performance.now()
    const stap = (nu: number) => {
      const dt = nu - vorige
      vorige = nu
      setTijd(t => {
        const n = t + dt * snelheid
        return n >= duur ? 0 : n
      })
      raf = requestAnimationFrame(stap)
    }
    raf = requestAnimationFrame(stap)
    return () => cancelAnimationFrame(raf)
  }, [speelt, snelheid, duur])

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const posities: Record<string, AnimPos> = frames.length > 1
      ? getPositionsAtTime(frames, objects, arrows, tijd, 1)
      : bareify(frames[0]?.positions ?? {})
    tekenBeeld(ctx, layout, data, posities, looplijnen, balbaan, tijd, timeline)
  }, [tijd, timeline, layout, data, frames, objects, arrows, looplijnen, balbaan])

  const knop = 'h-9 px-3 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5'

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
      <div>
        <canvas ref={canvasRef} width={layout.canvasW} height={layout.canvasH} className="w-full h-auto rounded-xl" />

        <div className="mt-3 flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => setSpeelt(p => !p)}
            className={`${knop} bg-neutral-900 text-white hover:bg-neutral-700 w-24 justify-center`}
            aria-label={speelt ? 'Pauzeren' : 'Afspelen'}
          >
            {speelt ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {speelt ? 'Pauze' : 'Speel'}
          </button>
          <input
            type="range"
            min={0}
            max={Math.max(duur, 1)}
            step={10}
            value={tijd}
            onChange={e => { setSpeelt(false); setTijd(Number(e.target.value)) }}
            className="flex-1 min-w-40 accent-sparta"
            aria-label="Tijdlijn"
          />
          <span className="text-xs text-neutral-400 tabular-nums w-20 text-right">{seconden(tijd)} / {seconden(duur)} s</span>
          <button
            type="button"
            onClick={() => setSnelheid(s => SPEEDS[(SPEEDS.indexOf(s as 1) + 1) % SPEEDS.length])}
            className={`${knop} border ${snelheid === 1 ? 'border-neutral-200 text-neutral-500' : 'border-sparta text-sparta bg-red-50'}`}
          >
            {String(snelheid).replace('.', ',')}x
          </button>
          <button type="button" onClick={() => { setSpeelt(false); setTijd(0) }} className={`${knop} border border-neutral-200 text-neutral-500 hover:text-neutral-900`} aria-label="Terug naar het begin">
            <RotateCcw className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => setLooplijnen(v => !v)} aria-pressed={looplijnen} className={`${knop} border ${looplijnen ? 'border-sparta text-sparta bg-red-50' : 'border-neutral-200 text-neutral-400'}`}>
            <Footprints className="w-4 h-4" /> Looplijnen
          </button>
          <button type="button" onClick={() => setBalbaan(v => !v)} aria-pressed={balbaan} className={`${knop} border ${balbaan ? 'border-sparta text-sparta bg-red-50' : 'border-neutral-200 text-neutral-400'}`}>
            <BallIcon className="w-4 h-4" /> Balbaan
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {stappen.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-2">Stappen</h3>
            <ol className="space-y-1">
              {stappen.map((s, i) => (
                <li key={s.index}>
                  <button
                    type="button"
                    onClick={() => setTijd(timeline[s.index]?.start ?? 0)}
                    aria-current={actieveStap === s.index}
                    className={`w-full text-left flex gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${actieveStap === s.index ? 'bg-red-50 text-neutral-900 ring-1 ring-sparta' : 'text-neutral-500 hover:bg-neutral-50'}`}
                  >
                    <span className="tabular-nums text-xs text-neutral-400 pt-0.5 w-8 shrink-0">{seconden(s.start)}s</span>
                    <span>{i + 1}. {s.text}</span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
        )}
        {legenda.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-2">Legenda</h3>
            <ul className="space-y-1.5">
              {legenda.map((r, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-neutral-600">
                  <span className="w-3 h-3 rounded-full border border-neutral-300 shrink-0" style={{ background: r.kleur }} />
                  {r.tekst}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
