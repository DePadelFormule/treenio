/**
 * Omzetting van het oude bordformaat (tokens en procenten) naar PlayData in
 * meters. Oude spelsituaties openen daardoor gewoon in het nieuwe tekenbord;
 * bij opslaan wordt het nieuwe formaat weggeschreven.
 */
import type { BordData } from '@/lib/types/database'
import type { PlayData, TBObject, Frame } from './types'
import { isPlayData } from './types'
import { PLAY_VERSION, VELD_BREEDTE_M, VELD_LENGTE_M, HALF_LENGTE_M } from './veld'

/** Clubkleuren voor de magneetjes: rood eigen team, zwart tegenstander, witte bal. */
export const KLEUR_EIGEN = '#C8102E'
export const KLEUR_TEGENSTANDER = '#111111'
export const KLEUR_BAL = '#ffffff'

function genId() {
  return `o-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function leegPlay(title = '', description = ''): PlayData {
  return {
    version: PLAY_VERSION,
    title,
    description,
    objects: [],
    zones: [], arrows: [], texts: [], strokes: [],
    frames: [{ id: genId(), positions: {}, hold_ms: 0 }],
  }
}

/**
 * Oud formaat: procenten van het beeld. Heel veld stond staand (x over de
 * breedte, y over de lengte van boven naar beneden), half veld lag met het
 * doel rechts (x richting het doel, y over de breedte). In meters is x altijd
 * de lengte en y de breedte; bij een half veld is de doellijn x=0.
 */
export function vanBordData(oud: BordData, halfVeld: boolean, title: string, description: string): PlayData {
  const objects: TBObject[] = oud.tokens.map(t => ({
    id: t.id,
    type: t.team === 'bal' ? 'ball' : 'player',
    color: t.team === 'bal' ? KLEUR_BAL : t.team === 'eigen' ? KLEUR_EIGEN : KLEUR_TEGENSTANDER,
    label: t.team === 'bal' ? undefined : t.label,
  }))
  const naarMeters = (p: { x: number; y: number }) => halfVeld
    ? { x: (1 - p.x / 100) * HALF_LENGTE_M, y: (p.y / 100) * VELD_BREEDTE_M }
    : { x: (p.y / 100) * VELD_LENGTE_M, y: (p.x / 100) * VELD_BREEDTE_M }
  const frames: Frame[] = (oud.frames.length ? oud.frames : [{}]).map(f => ({
    id: genId(),
    positions: Object.fromEntries(Object.entries(f).map(([id, p]) => [id, naarMeters(p)])),
    hold_ms: 0,
  }))
  return { ...leegPlay(title, description), objects, frames }
}

/** Wat er ook in de database staat, hier komt PlayData uit. */
export function naarPlayData(data: unknown, halfVeld: boolean, title: string, description: string): PlayData {
  if (isPlayData(data)) return { ...data, strokes: data.strokes ?? [] }
  const oud = (data ?? {}) as Partial<BordData>
  return vanBordData({ tokens: oud.tokens ?? [], frames: oud.frames ?? [{}] }, halfVeld, title, description)
}
