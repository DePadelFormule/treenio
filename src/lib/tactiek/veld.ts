/**
 * Het veld in meters, en de omrekening naar een canvas.
 *
 * Een spelsituatie slaat posities op in meters: x over de lengte van het
 * veld, y over de breedte (68 meter). Bij een heel veld loopt x van 0 tot
 * 105, doellijn tot doellijn. Bij een half veld loopt x van 0 (de doellijn)
 * tot 52,5 (de middellijn). Zo staat de data los van het beeld: hetzelfde
 * frame kan staand op het tekenbord en als stilstaand beeld op papier.
 *
 * Wie buiten het veld staat, zoals de trainer langs de lijn, krijgt gewoon
 * een waarde buiten dat bereik. Er wordt hier niets afgekapt.
 */
import type { PlayData, Zone, Arrow, TextLabel, Frame, Stroke } from './types'

export type VeldSoort = 'heel' | 'half'

export const VELD_BREEDTE_M = 68
export const VELD_LENGTE_M = 105
/** Bij een half veld is de doellijn x=0 en de middellijn x=52,5. */
export const HALF_LENGTE_M = VELD_LENGTE_M / 2

export function veldLengte(soort: VeldSoort) {
  return soort === 'heel' ? VELD_LENGTE_M : HALF_LENGTE_M
}

/** Vaste maten van de belijning, in meters. */
export const STRAFSCHOPGEBIED_DIEP = 16.5
export const STRAFSCHOPGEBIED_BREED = 40.32
export const DOELGEBIED_DIEP = 5.5
export const DOELGEBIED_BREED = 18.32
export const STRAFSCHOPSTIP = 11
export const CIRKEL_R = 9.15
export const DOEL_BREED = 7.32
export const DOEL_DIEP = 2

export const PLAY_VERSION = 1

export type Orientation = 'portrait' | 'landscape'

export interface Pt { x: number; y: number }
export interface Rect { x: number; y: number; w: number; h: number }

export interface Projection {
  soort: VeldSoort
  orientation: Orientation
  /** Pixels per meter. */
  scale: number
  /** Het speelveld (binnen de lijnen) in canvas-pixels. */
  playLeft: number
  playTop: number
  playW: number
  playH: number
  /** Gras rondom het veld, in pixels. */
  wall: number
  /** Het veld inclusief de rand gras, in canvas-pixels. */
  courtX: number
  courtY: number
  courtW: number
  courtH: number
  /** Meters naar canvas-pixels. */
  toCanvas(p: Pt): Pt
  /** Canvas-pixels terug naar meters. */
  toMeters(p: Pt): Pt
  /** Een afstand in meters naar pixels. */
  len(meters: number): number
}

/**
 * Bouw een omrekening. Staand loopt de lengte van boven naar beneden (bij
 * een half veld ligt de doellijn dan boven), liggend van links naar rechts.
 */
export function createProjection(
  soort: VeldSoort,
  orientation: Orientation,
  scale: number,
  playLeft: number,
  playTop: number,
  wall: number,
): Projection {
  const lengte = veldLengte(soort)
  const alongX = orientation === 'landscape'
  const playW = (alongX ? lengte : VELD_BREEDTE_M) * scale
  const playH = (alongX ? VELD_BREEDTE_M : lengte) * scale
  return {
    soort,
    orientation,
    scale,
    playLeft,
    playTop,
    playW,
    playH,
    wall,
    courtX: playLeft - wall,
    courtY: playTop - wall,
    courtW: playW + 2 * wall,
    courtH: playH + 2 * wall,
    toCanvas: (p) =>
      alongX
        ? { x: playLeft + p.x * scale, y: playTop + p.y * scale }
        : { x: playLeft + p.y * scale, y: playTop + p.x * scale },
    toMeters: (c) =>
      alongX
        ? { x: (c.x - playLeft) / scale, y: (c.y - playTop) / scale }
        : { x: (c.y - playTop) / scale, y: (c.x - playLeft) / scale },
    len: (meters) => meters * scale,
  }
}

// ----- Canvas van het tekenbord -----
/** Rand gras om het veld, in pixels. Daar staan ook de doelen in. */
export const WALL = 30
/** Breedte van het speelveld op het tekenbord, in pixels. */
const BORD_PLAY_W = 640
export const BORD_CANVAS_W = 900
/** Ruimte boven het veld voor de titel. */
export const BORD_TOP = 110
/** Ruimte onder het veld voor de uitleg en de voettekst. */
const BORD_BOTTOM = 150

export interface BordLayout {
  canvasW: number
  canvasH: number
  projection: Projection
}

/**
 * Het staande tekenbord: het veld zo breed mogelijk, de hoogte volgt uit de
 * lengte van het veld. Een heel veld wordt zo een hoog beeld, een half veld
 * een compacter beeld met het doel bovenin.
 */
export function bordLayout(soort: VeldSoort): BordLayout {
  const scale = BORD_PLAY_W / VELD_BREEDTE_M
  const playLeft = (BORD_CANVAS_W - BORD_PLAY_W) / 2
  const playTop = BORD_TOP + WALL
  const projection = createProjection(soort, 'portrait', scale, playLeft, playTop, WALL)
  return {
    canvasW: BORD_CANVAS_W,
    canvasH: Math.round(playTop + projection.playH + WALL + BORD_BOTTOM),
    projection,
  }
}

/**
 * De speler en het printbeeld: alleen het veld met een smalle rand, liggend
 * bij een heel veld (past beter op een scherm) en staand bij een half veld
 * (doel boven).
 */
export function kijkLayout(soort: VeldSoort): BordLayout {
  const marge = 24
  const orientation: Orientation = soort === 'heel' ? 'landscape' : 'portrait'
  const scale = soort === 'heel' ? 1200 / VELD_LENGTE_M : 900 / VELD_BREEDTE_M
  const projection = createProjection(soort, orientation, scale, marge + WALL, marge + WALL, WALL)
  return {
    canvasW: Math.round(projection.courtW + 2 * marge),
    canvasH: Math.round(projection.courtH + 2 * marge),
    projection,
  }
}

export function rectToCanvas(r: Rect, proj: Projection): Rect {
  const a = proj.toCanvas({ x: r.x, y: r.y })
  const b = proj.toCanvas({ x: r.x + r.w, y: r.y + r.h })
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) }
}

export function rectToMeters(r: Rect, proj: Projection): Rect {
  const a = proj.toMeters({ x: r.x, y: r.y })
  const b = proj.toMeters({ x: r.x + r.w, y: r.y + r.h })
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) }
}

function mapPlay(data: PlayData, point: (p: Pt) => Pt, rect: (r: Rect) => Rect): PlayData {
  return {
    ...data,
    zones: data.zones.map((z: Zone) => ({ ...z, ...rect({ x: z.x, y: z.y, w: z.w, h: z.h }) })),
    arrows: data.arrows.map((a: Arrow) => {
      const p1 = point({ x: a.x1, y: a.y1 })
      const p2 = point({ x: a.x2, y: a.y2 })
      return { ...a, x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y }
    }),
    texts: data.texts.map((t: TextLabel) => ({
      ...t,
      ...point({ x: t.x, y: t.y }),
      tail: t.tail ? point(t.tail) : undefined,
    })),
    strokes: (data.strokes ?? []).map((s: Stroke) => ({ ...s, points: s.points.map(point) })),
    frames: data.frames.map((f: Frame) => ({
      ...f,
      positions: Object.fromEntries(Object.entries(f.positions).map(([id, p]) => [id, point(p)])),
    })),
  }
}

/** Van meters naar de pixels van een canvas. */
export function toCanvasSpace(data: PlayData, proj: Projection): PlayData {
  return mapPlay(data, (p) => proj.toCanvas(p), (r) => rectToCanvas(r, proj))
}

/** Van de pixels van een canvas terug naar meters. */
export function toMeterSpace(data: PlayData, proj: Projection): PlayData {
  return mapPlay(data, (p) => proj.toMeters(p), (r) => rectToMeters(r, proj))
}
