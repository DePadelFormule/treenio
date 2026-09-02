/**
 * Tijdlijn van een spelsituatie: waar staat elk object op moment t. Frames
 * houden elk hun eigen wachttijd en vertraging, en een pijl die aan een
 * object hangt bepaalt het pad van dat object tijdens die overgang.
 */
import type { Frame, TBObject, Arrow, AnimPos } from './types'
import { FRAME_MS, OPTION_VISIBLE_MS, OPTION_FADE_MS, FRAME_FADE_MS, easeInOutCubic, lobControlPoint } from './render'

export type Timeline = { start: number; holdEnd: number; transitionEnd: number }[]

/**
 * Hoe zichtbaar iets is dat bij één frame hoort (zone, ballon, stift): in
 * beeld vanaf het begin van dat frame, en vervaagd tegen de tijd dat het
 * volgende frame begint. Het laatste frame blijft tot het einde. Zonder frame altijd.
 */
export function frameAlphaAt(frameIndex: number | undefined, timeline: Timeline, t: number): number {
  if (frameIndex === undefined) return 1
  const seg = timeline[frameIndex]
  if (!seg) return 0
  if (t < seg.start) return 0
  if (frameIndex >= timeline.length - 1) return 1
  const end = seg.transitionEnd
  if (t >= end) return 0
  const fadeStart = Math.max(seg.start, end - FRAME_FADE_MS)
  if (t <= fadeStart) return 1
  return 1 - (t - fadeStart) / (end - fadeStart)
}

/** De ondertitel op moment t: de tekst van de laatste stap die al begonnen is. */
export function subtitleAt(frames: Frame[], timeline: Timeline, t: number): string {
  let tekst = ''
  for (let i = 0; i < frames.length; i++) {
    const s = frames[i].text?.trim()
    if (s && (timeline[i]?.start ?? 0) <= t + 1) tekst = s
  }
  return tekst
}

/**
 * Hoe zichtbaar een optie-lijn is op moment t (0 tot 1). Hij verschijnt zodra
 * zijn frame begint, staat twee seconden en vervaagt dan.
 */
export function optionAlphaAt(arrow: Arrow, timeline: Timeline, t: number): number {
  const start = timeline[arrow.frameIndex ?? 0]?.start ?? 0
  const dt = t - start
  if (dt < 0) return 0
  if (dt <= OPTION_VISIBLE_MS) return 1
  if (dt <= OPTION_VISIBLE_MS + OPTION_FADE_MS) return 1 - (dt - OPTION_VISIBLE_MS) / OPTION_FADE_MS
  return 0
}

export function computeTimeline(frames: Frame[], speed: number): Timeline {
  let t = 0
  return frames.map((f, i) => {
    const start = t
    const holdEnd = t + (f.hold_ms ?? 0) / speed
    t = holdEnd
    // De vertraging zit op de overgang NAAR het volgende frame.
    const nextSlow = frames[i + 1]?.slow_in ?? 1
    const transitionEnd = i < frames.length - 1 ? t + (FRAME_MS / nextSlow) / speed : t
    t = transitionEnd
    return { start, holdEnd, transitionEnd }
  })
}

/** Posities zonder animatie-extra's: precies zoals ze in het frame staan. */
export function bareify(positions: Record<string, { x: number; y: number }>): Record<string, AnimPos> {
  const out: Record<string, AnimPos> = {}
  for (const k of Object.keys(positions)) out[k] = { x: positions[k].x, y: positions[k].y }
  return out
}

export function getPositionsAtTime(frames: Frame[], objects: TBObject[], arrows: Arrow[], elapsed: number, speed: number): Record<string, AnimPos> {
  if (frames.length <= 1) return bareify(frames[0]?.positions ?? {})
  const timeline = computeTimeline(frames, speed)
  const total = timeline[timeline.length - 1].transitionEnd
  if (total <= 0) return bareify(frames[0]?.positions ?? {})
  const wrapped = ((elapsed % total) + total) % total
  for (let i = 0; i < frames.length; i++) {
    const seg = timeline[i]
    if (wrapped >= seg.start && wrapped <= seg.holdEnd) {
      return bareify(frames[i].positions)
    }
    if (i < frames.length - 1 && wrapped > seg.holdEnd && wrapped <= seg.transitionEnd) {
      const localT = (wrapped - seg.holdEnd) / (seg.transitionEnd - seg.holdEnd)
      const eased = easeInOutCubic(localT)
      const result: Record<string, AnimPos> = {}
      for (const obj of objects) {
        const a = frames[i].positions[obj.id]
        const b = frames[i + 1].positions[obj.id]
        if (!a && !b) continue

        // Hangt er een lob-pijl aan dit object voor deze overgang, dan vliegt
        // de bal langs de boog en wordt hij groter naarmate hij hoger komt.
        const attached = arrows.find(ar => ar.attachedObjectId === obj.id && ar.frameIndex === i)
        if (attached && a && b && attached.style === 'lob') {
          const { cpX, cpY } = lobControlPoint(a.x, a.y, b.x, b.y)
          const t = eased
          const omt = 1 - t
          const x = omt * omt * a.x + 2 * omt * t * cpX + t * t * b.x
          const y = omt * omt * a.y + 2 * omt * t * cpY + t * t * b.y
          const scale = 1 + 0.85 * Math.sin(Math.PI * t)
          const shx = a.x + (b.x - a.x) * t
          const shy = a.y + (b.y - a.y) * t
          const arcDist = Math.hypot(x - shx, y - shy)
          result[obj.id] = { x, y, scale, shadow: { x: shx, y: shy, alpha: 0.35 * Math.sin(Math.PI * t), spread: Math.max(0, arcDist * 0.04) } }
          continue
        }

        if (a && b) result[obj.id] = { x: a.x + (b.x - a.x) * eased, y: a.y + (b.y - a.y) * eased }
        else if (a) result[obj.id] = { x: a.x, y: a.y }
        else if (b) result[obj.id] = { x: b.x, y: b.y }
      }
      return result
    }
  }
  return bareify(frames[frames.length - 1]?.positions ?? {})
}
