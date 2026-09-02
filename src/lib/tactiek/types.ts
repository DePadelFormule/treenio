/**
 * Datamodel van een spelsituatie: magneetjes, pijlen, zones, ballonnen en
 * stiftlijnen op een veld, met frames die de beweging bepalen. Posities
 * staan in meters (x over de lengte, y over de breedte) zodat dezelfde
 * data op het tekenbord, in de speler en op papier getekend kan worden.
 *
 * De namen zijn gelijk gehouden aan de tactiek-engine van Prepalo, zodat
 * verbeteringen tussen beide apps één op één over te zetten zijn.
 */

export type Tool =
  | 'select' | 'player' | 'trainer' | 'ball'
  | 'cone' | 'goal'
  | 'arrow' | 'lob' | 'run' | 'option' | 'zone' | 'text' | 'pen' | 'eraser'

export interface TBObject {
  id: string
  /** cone en goal zijn markeringen: een pion of een doeltje, klein of groot. */
  type: 'player' | 'trainer' | 'ball' | 'cone' | 'goal'
  color: string
  /** Rugnummer of korte naam op het magneetje. */
  label?: string
  /** Alleen bij markeringen; ontbreekt betekent klein. */
  size?: 'small' | 'large'
}

/** Pionnen en doeltjes: staan op het veld, bewegen niet mee en zitten nergens aan vast. */
export function isMarker(obj: TBObject) {
  return obj.type === 'cone' || obj.type === 'goal'
}

export interface Frame {
  id: string
  positions: Record<string, { x: number; y: number }>
  /** Hoe lang dit frame stilstaat voordat de beweging verder gaat. */
  hold_ms?: number
  /** Een frame met tekst is een stap: in de speler klikbaar en als ondertitel in beeld. */
  text?: string
  highlights?: string[]
  /** Vertraging op de overgang naar dit frame (0,5 = twee keer zo langzaam). */
  slow_in?: number
}

export interface AnimPos {
  x: number
  y: number
  scale?: number
  shadow?: { x: number; y: number; spread: number; alpha: number }
  gait?: { swing: number; lean: number }
}

export type ZoneColor = 'red' | 'green' | 'orange'

export interface Zone {
  id: string
  color: ZoneColor
  x: number; y: number; w: number; h: number
  /** Het frame waarin de zone hoort; daarna vervaagt hij. Ontbreekt bij een zone die altijd in beeld staat. */
  frameIndex?: number
}

export interface Arrow {
  id: string
  color: string
  /**
   * undefined of straight: een pass of pijl. lob: hoge bal. run: looplijn,
   * gestippeld. option: een vage egale lijn die een mogelijkheid toont,
   * alleen te zien in zijn eigen frame en tijdens afspelen na twee seconden weer weg.
   */
  style?: 'straight' | 'lob' | 'run' | 'option'
  /** Vastgemaakt aan een object: dan stuurt de pijl diens beweging tussen frameIndex en frameIndex + 1. */
  attachedObjectId?: string
  /** Bij een vastgemaakte pijl de overgang die hij stuurt; bij een optie het frame waarin hij hoort. */
  frameIndex?: number
  x1: number; y1: number; x2: number; y2: number
}

export interface TextLabel {
  id: string
  color: string
  x: number; y: number
  text: string
  /** Punt waar de ballon naar wijst. */
  tail?: { x: number; y: number }
  /** Het frame waarin de ballon hoort; daarna vervaagt hij. Ontbreekt bij een ballon die altijd in beeld staat. */
  frameIndex?: number
}

/** Een vrije stiftlijn, zoals op een whiteboard. Hoort bij het frame waarin hij is getekend. */
export interface Stroke {
  id: string
  color: string
  /** Dikte in canvas-pixels; wordt niet meegeschaald. */
  width: number
  points: { x: number; y: number }[]
  frameIndex?: number
}

export type Selection =
  | { kind: 'object'; id: string }
  | { kind: 'zone'; id: string }
  | { kind: 'arrow'; id: string }
  | { kind: 'text'; id: string }
  | null

export interface PlayData {
  version?: number
  title: string
  description: string
  objects: TBObject[]
  zones: Zone[]
  arrows: Arrow[]
  texts: TextLabel[]
  strokes?: Stroke[]
  frames: Frame[]
}

/** Herkent het nieuwe formaat aan de objects-lijst; het oude formaat had tokens. */
export function isPlayData(data: unknown): data is PlayData {
  return !!data && typeof data === 'object' && Array.isArray((data as PlayData).objects) && Array.isArray((data as PlayData).frames)
}
