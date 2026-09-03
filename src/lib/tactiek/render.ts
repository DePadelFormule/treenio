/**
 * Tekenwerk van het tactiekbord: kleuren en alle functies die op een canvas
 * tekenen. Zonder React, zodat het tekenbord, de speler, de video-export en
 * het printbeeld dezelfde code gebruiken.
 */
import type { Zone, ZoneColor, Arrow, TextLabel, TBObject, Stroke } from './types'
import type { Projection, BordLayout } from './veld'
import {
  VELD_BREEDTE_M, veldLengte, rectToCanvas,
  STRAFSCHOPGEBIED_DIEP, STRAFSCHOPGEBIED_BREED, DOELGEBIED_DIEP, DOELGEBIED_BREED,
  STRAFSCHOPSTIP, CIRKEL_R, DOEL_BREED, DOEL_DIEP,
} from './veld'

export { PLAY_VERSION } from './veld'

/** Vlakke kleuren, zodat een situatie in een oogopslag te lezen is op een telefoon. */
export const C_BG = '#0d0d12'
export const C_GRASS = '#2e8b46'
export const C_GRASS_EDGE = '#256f38'
export const C_LINE = '#ffffff'
export const C_GOAL = '#e5e7eb'
export const C_BALL = '#ffffff'
export const C_ACCENT = '#C8102E'

/** Standaardduur van een overgang tussen twee frames. */
export const FRAME_MS = 1000
export const RECORD_FPS = 30

/** Pijlen vervagen tijdens afspelen na een moment, zodat het veld schoon blijft. */
export const ARROW_VISIBLE_MS = 1000
export const ARROW_FADE_MS = 500
/** Een optie-lijn staat twee seconden in beeld na het begin van zijn frame en vervaagt dan. */
export const OPTION_VISIBLE_MS = 2000
export const OPTION_FADE_MS = 500
/** Een optie-lijn is bewust vaag, ook op volle sterkte. */
export const OPTION_ALPHA = 0.55
/** Een zone of ballon die bij een frame hoort vervaagt zo lang voordat het volgende frame begint. */
export const FRAME_FADE_MS = 300

/** Straal van een magneetje in canvas-pixels. */
export const MAGNET_R = 20
export const BALL_R = 11
/** Pionnen: halve breedte van de voet. Doeltjes: halve breedte en halve diepte van het frame. */
export const CONE_R = { small: 9, large: 14 } as const
export const GOAL_HALF = { small: { w: 18, d: 7 }, large: { w: 34, d: 11 } } as const

/** Hoe ver van het midden je iets nog aanklikt of raakt. */
export function objectRadius(obj: TBObject): number {
  if (obj.type === 'ball') return BALL_R
  if (obj.type === 'cone') return CONE_R[obj.size ?? 'small']
  if (obj.type === 'goal') { const g = GOAL_HALF[obj.size ?? 'small']; return Math.hypot(g.w, g.d) }
  return MAGNET_R
}

/** Maatvoering van een tekstballon, gedeeld door tekenen en aanklikken. */
export const LABEL_FONT = 'bold 30px ui-sans-serif, system-ui, sans-serif'
export const LABEL_MAX_W = 360
export const LABEL_LINE_H = 40

export const ZONE_STYLE: Record<ZoneColor, { fill: string; stroke: string; hatch: string }> = {
  red: { fill: 'rgba(239, 68, 68, 0.32)', stroke: '#ef4444', hatch: 'rgba(239, 68, 68, 0.55)' },
  green: { fill: 'rgba(250, 204, 21, 0.28)', stroke: '#facc15', hatch: 'rgba(250, 204, 21, 0.55)' },
  orange: { fill: 'rgba(59, 130, 246, 0.32)', stroke: '#3b82f6', hatch: 'rgba(59, 130, 246, 0.6)' },
}

// ----- Hulpfuncties -----
export function genId() {
  return `o-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const tentative = current ? `${current} ${word}` : word
    if (ctx.measureText(tentative).width > maxWidth && current) {
      lines.push(current)
      current = word
    } else current = tentative
  }
  if (current) lines.push(current)
  return lines
}

/** Pad voor een afgeronde rechthoek, met terugval voor oudere browsers. */
export function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  if (ctx.roundRect) { ctx.roundRect(x, y, w, h, r); return }
  ctx.rect(x, y, w, h)
}

/** Grofweg: is dit een lichte kleur? Bepaalt of de contour donker of licht wordt. */
export function isLightColor(hex: string): boolean {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim())
  if (!m) return false
  const [r, g, b] = [m[1], m[2], m[3]].map(v => parseInt(v, 16))
  return (0.299 * r + 0.587 * g + 0.114 * b) > 150
}

/**
 * Ondertitel: witte tekst op een donker balkje, gecentreerd op centerX met de
 * onderkant op bottomY. Zegt wat er nu te zien is; komt ook mee in de video.
 */
export function drawSubtitle(ctx: CanvasRenderingContext2D, text: string, centerX: number, bottomY: number, maxWidth: number, fontPx: number) {
  const t = text.trim()
  if (!t) return
  ctx.save()
  ctx.font = `600 ${fontPx}px ui-sans-serif, system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const padX = fontPx * 0.7
  const lineH = fontPx * 1.3
  const lines = wrapText(ctx, t, maxWidth - 2 * padX).slice(0, 3)
  const w = Math.max(...lines.map(l => ctx.measureText(l).width)) + 2 * padX
  const h = lines.length * lineH + fontPx * 0.5
  const x = centerX - w / 2
  const y = bottomY - h
  ctx.fillStyle = 'rgba(13, 13, 18, 0.78)'
  roundRectPath(ctx, x, y, w, h, fontPx * 0.4)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  lines.forEach((line, i) => ctx.fillText(line, centerX, y + fontPx * 0.25 + lineH * (i + 0.5)))
  ctx.restore()
}

// ----- Het veld -----

/**
 * Het veld met belijning. Alles wordt in meters opgegeven en via de
 * projectie omgerekend, zodat staand en liggend dezelfde code delen.
 */
export function drawPitch(ctx: CanvasRenderingContext2D, proj: Projection) {
  const lengte = veldLengte(proj.soort)
  const B = VELD_BREEDTE_M
  const mid = B / 2

  const rect = (x: number, y: number, w: number, h: number) => rectToCanvas({ x, y, w, h }, proj)
  const strokeRectM = (x: number, y: number, w: number, h: number) => {
    const r = rect(x, y, w, h)
    ctx.strokeRect(r.x, r.y, r.w, r.h)
  }
  const lineM = (x1: number, y1: number, x2: number, y2: number) => {
    const a = proj.toCanvas({ x: x1, y: y1 })
    const b = proj.toCanvas({ x: x2, y: y2 })
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()
  }
  const circleM = (cx: number, cy: number, r: number, fill = false) => {
    const c = proj.toCanvas({ x: cx, y: cy })
    ctx.beginPath(); ctx.arc(c.x, c.y, proj.len(r), 0, Math.PI * 2)
    if (fill) ctx.fill(); else ctx.stroke()
  }
  /** Een cirkel waarvan alleen het deel buiten `buiten` en binnen `binnen` te zien is. */
  const clippedCircle = (cx: number, cy: number, r: number, binnen: [number, number, number, number], buiten?: [number, number, number, number]) => {
    ctx.save()
    const b = rect(...binnen)
    ctx.beginPath()
    ctx.rect(b.x, b.y, b.w, b.h)
    if (buiten) {
      const u = rect(...buiten)
      ctx.rect(u.x, u.y, u.w, u.h)
      ctx.clip('evenodd')
    } else ctx.clip()
    circleM(cx, cy, r)
    ctx.restore()
  }

  // Gras, inclusief de rand rondom het veld.
  ctx.save()
  ctx.fillStyle = C_GRASS_EDGE
  roundRectPath(ctx, proj.courtX, proj.courtY, proj.courtW, proj.courtH, 18)
  ctx.fill()
  ctx.fillStyle = C_GRASS
  ctx.fillRect(proj.playLeft, proj.playTop, proj.playW, proj.playH)
  ctx.restore()

  ctx.save()
  ctx.strokeStyle = C_LINE
  ctx.fillStyle = C_LINE
  ctx.lineWidth = Math.max(2, proj.len(0.35))
  ctx.lineCap = 'square'

  // Buitenlijnen.
  strokeRectM(0, 0, lengte, B)

  // Gebieden aan een doellijn. `x0` is de doellijn, `dir` wijst het veld in.
  const doelkant = (x0: number, dir: 1 | -1) => {
    const box = (diep: number, breed: number): [number, number, number, number] =>
      dir === 1 ? [x0, mid - breed / 2, diep, breed] : [x0 - diep, mid - breed / 2, diep, breed]
    strokeRectM(...box(STRAFSCHOPGEBIED_DIEP, STRAFSCHOPGEBIED_BREED))
    strokeRectM(...box(DOELGEBIED_DIEP, DOELGEBIED_BREED))
    const stip = x0 + dir * STRAFSCHOPSTIP
    circleM(stip, mid, 0.3, true)
    clippedCircle(stip, mid, CIRKEL_R, [0, 0, lengte, B], box(STRAFSCHOPGEBIED_DIEP, STRAFSCHOPGEBIED_BREED))
    // Het doel, net buiten de lijn.
    ctx.save()
    ctx.strokeStyle = C_GOAL
    ctx.lineWidth = Math.max(2, proj.len(0.3))
    const g = dir === 1
      ? rect(x0 - DOEL_DIEP, mid - DOEL_BREED / 2, DOEL_DIEP, DOEL_BREED)
      : rect(x0, mid - DOEL_BREED / 2, DOEL_DIEP, DOEL_BREED)
    ctx.strokeRect(g.x, g.y, g.w, g.h)
    ctx.restore()
  }

  if (proj.soort === 'heel') {
    doelkant(0, 1)
    doelkant(lengte, -1)
    lineM(lengte / 2, 0, lengte / 2, B)
    circleM(lengte / 2, mid, CIRKEL_R)
    circleM(lengte / 2, mid, 0.3, true)
  } else {
    // Half veld: de doellijn is x=0, de middellijn x=52,5 met een halve cirkel.
    doelkant(0, 1)
    clippedCircle(lengte, mid, CIRKEL_R, [0, 0, lengte, B])
    circleM(lengte, mid, 0.3, true)
  }
  ctx.restore()
}

/** Achtergrond van het tekenbord: titel, veld, uitleg en voettekst. */
export function drawBoardCanvas(canvas: HTMLCanvasElement, layout: BordLayout, title: string, description: string) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const { canvasW, canvasH, projection } = layout

  ctx.fillStyle = C_BG
  ctx.fillRect(0, 0, canvasW, canvasH)

  if (title.trim()) {
    ctx.save()
    ctx.font = 'bold 38px ui-sans-serif, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#ffffff'
    const lines = wrapText(ctx, title, canvasW - 80).slice(0, 2)
    const top = lines.length > 1 ? 30 : 56
    lines.forEach((line, i) => ctx.fillText(line, canvasW / 2, top + i * 44))
    ctx.restore()
  }

  drawPitch(ctx, projection)

  const descText = description.trim()
  const onder = projection.courtY + projection.courtH
  if (descText) {
    ctx.save()
    ctx.font = '28px ui-sans-serif, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#cbd5e1'
    const lines = wrapText(ctx, descText, canvasW - 80).slice(0, 2)
    lines.forEach((line, i) => ctx.fillText(line, canvasW / 2, onder + 40 + i * 36))
    ctx.restore()
  }

  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = 'bold 30px ui-sans-serif, system-ui, sans-serif'
  ctx.fillStyle = C_ACCENT
  ctx.fillText('Treenio', canvasW / 2, canvasH - 44)
  ctx.restore()
}

// ----- Tekenprimitieven voor de overlay -----
export function drawZone(ctx: CanvasRenderingContext2D, zone: Zone, selected: boolean) {
  const { x, y, w, h } = zone
  if (w < 4 || h < 4) return
  const style = ZONE_STYLE[zone.color]
  ctx.save()
  ctx.fillStyle = style.fill
  roundRectPath(ctx, x, y, w, h, 12)
  ctx.fill()
  ctx.strokeStyle = style.stroke
  ctx.lineWidth = selected ? 3.5 : 2.5
  if (selected) ctx.setLineDash([8, 5])
  roundRectPath(ctx, x, y, w, h, 12)
  ctx.stroke()
  ctx.restore()
}

export function drawZonePreview(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: ZoneColor) {
  const style = ZONE_STYLE[color]
  ctx.save()
  ctx.fillStyle = style.fill
  roundRectPath(ctx, x, y, w, h, 12); ctx.fill()
  ctx.strokeStyle = style.stroke; ctx.lineWidth = 2.5; ctx.setLineDash([8, 5])
  roundRectPath(ctx, x, y, w, h, 12); ctx.stroke()
  ctx.restore()
}

export function lobControlPoint(x1: number, y1: number, x2: number, y2: number) {
  const midX = (x1 + x2) / 2
  const midY = (y1 + y2) / 2
  const dx = x2 - x1, dy = y2 - y1
  const len = Math.hypot(dx, dy)
  if (len === 0) return { cpX: midX, cpY: midY }
  const perpX = -dy / len
  const perpY = dx / len
  // De boog buigt naar boven op het scherm, zodat hij leest als "door de lucht".
  const sign = perpY < 0 ? 1 : -1
  const arch = Math.min(160, Math.max(40, len * 0.32))
  return { cpX: midX + perpX * arch * sign, cpY: midY + perpY * arch * sign }
}

export function drawArrow(ctx: CanvasRenderingContext2D, arrow: Arrow, selected: boolean, alpha = 1) {
  if (alpha <= 0) return
  const { x1, y1, x2, y2, color, style } = arrow
  // Fijne lijnen: een pijl is een aanwijzing, geen balk over het veld.
  const headLen = 20
  const headHoek = 0.38
  ctx.save()
  ctx.globalAlpha = style === 'option' ? alpha * OPTION_ALPHA : alpha
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = 4
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  let tipAngle: number
  if (style === 'option') {
    // Dunne egale lijn met een open punt: dit is een mogelijkheid, geen actie.
    ctx.lineWidth = 3
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke()
    tipAngle = Math.atan2(y2 - y1, x2 - x1)
    ctx.beginPath()
    ctx.moveTo(x2 - headLen * Math.cos(tipAngle - headHoek), y2 - headLen * Math.sin(tipAngle - headHoek))
    ctx.lineTo(x2, y2)
    ctx.lineTo(x2 - headLen * Math.cos(tipAngle + headHoek), y2 - headLen * Math.sin(tipAngle + headHoek))
    ctx.stroke()
    ctx.restore()
    if (selected) drawArrowSelection(ctx, arrow)
    return
  }
  if (style === 'lob') {
    const { cpX, cpY } = lobControlPoint(x1, y1, x2, y2)
    ctx.setLineDash([12, 9])
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.quadraticCurveTo(cpX, cpY, x2, y2)
    ctx.stroke()
    ctx.setLineDash([])
    tipAngle = Math.atan2(y2 - cpY, x2 - cpX)
    ctx.beginPath()
    ctx.arc(cpX, cpY, 4, 0, Math.PI * 2)
    ctx.fill()
  } else {
    // Een looplijn is gestippeld: lopen, geen bal.
    if (style === 'run') ctx.setLineDash([10, 9])
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke()
    ctx.setLineDash([])
    tipAngle = Math.atan2(y2 - y1, x2 - x1)
  }

  ctx.beginPath()
  ctx.moveTo(x2, y2)
  ctx.lineTo(x2 - headLen * Math.cos(tipAngle - headHoek), y2 - headLen * Math.sin(tipAngle - headHoek))
  ctx.lineTo(x2 - headLen * Math.cos(tipAngle + headHoek), y2 - headLen * Math.sin(tipAngle + headHoek))
  ctx.closePath(); ctx.fill()
  ctx.restore()
  if (selected && alpha >= 0.5) drawArrowSelection(ctx, arrow)
}

function drawArrowSelection(ctx: CanvasRenderingContext2D, { x1, y1, x2, y2 }: Arrow) {
  ctx.save()
  ctx.strokeStyle = '#facc15'; ctx.lineWidth = 2; ctx.setLineDash([5, 4])
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke()
  ctx.setLineDash([])
  ctx.fillStyle = '#facc15'
  ctx.beginPath(); ctx.arc(x1, y1, 5, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(x2, y2, 5, 0, Math.PI * 2); ctx.fill()
  ctx.restore()
}

/** Regels en maat van een tekstballon. Gedeeld door tekenen en aanklikken. */
export function textLabelBox(ctx: CanvasRenderingContext2D, label: TextLabel) {
  ctx.save()
  ctx.font = LABEL_FONT
  const lines = wrapText(ctx, label.text, LABEL_MAX_W)
  const w = Math.max(...lines.map(l => ctx.measureText(l).width)) + 44
  const h = lines.length * LABEL_LINE_H + 24
  ctx.restore()
  return { lines, w, h }
}

/** Tekstballon: een witte kaart met zwarte tekst en een punt naar waar hij over gaat. */
export function drawTextLabel(ctx: CanvasRenderingContext2D, label: TextLabel, selected: boolean) {
  const { lines, w, h } = textLabelBox(ctx, label)
  const x = label.x
  const y = label.y

  ctx.save()
  ctx.font = LABEL_FONT
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#ffffff'
  roundRectPath(ctx, x - w / 2, y - h / 2, w, h, 16)
  ctx.fill()
  ctx.strokeStyle = label.color
  ctx.lineWidth = 2
  roundRectPath(ctx, x - w / 2, y - h / 2, w, h, 16)
  ctx.stroke()
  if (label.tail) drawBalloonTail(ctx, x, y, w, h, label.tail, label.color)
  ctx.fillStyle = '#0f172a'
  const firstY = y - ((lines.length - 1) * LABEL_LINE_H) / 2
  lines.forEach((line, i) => ctx.fillText(line, x, firstY + i * LABEL_LINE_H))
  ctx.restore()

  if (selected) {
    ctx.save()
    ctx.strokeStyle = '#facc15'; ctx.lineWidth = 3; ctx.setLineDash([6, 5])
    ctx.strokeRect(x - w / 2 - 5, y - h / 2 - 5, w + 10, h + 10)
    ctx.setLineDash([])
    if (label.tail) {
      ctx.fillStyle = '#facc15'
      ctx.beginPath(); ctx.arc(label.tail.x, label.tail.y, 7, 0, Math.PI * 2); ctx.fill()
    }
    ctx.restore()
  }
  return { x, y, w, h }
}

/** Driehoekige punt van de kaartrand naar het anker. */
export function drawBalloonTail(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  tail: { x: number; y: number },
  color: string,
) {
  const dx = tail.x - x
  const dy = tail.y - y
  const len = Math.hypot(dx, dy)
  const hw = w / 2
  const hh = h / 2
  if (len < 12 || (Math.abs(dx) < hw && Math.abs(dy) < hh)) return

  const k = 1 / Math.max(Math.abs(dx) / hw, Math.abs(dy) / hh)
  const ex = x + dx * k
  const ey = y + dy * k
  const px = -dy / len
  const py = dx / len
  const half = Math.min(16, Math.max(9, len * 0.12))
  const ax = ex + px * half, ay = ey + py * half
  const bx = ex - px * half, by = ey - py * half

  ctx.save()
  ctx.lineJoin = 'round'
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.moveTo(ax, ay)
  ctx.lineTo(tail.x, tail.y)
  ctx.lineTo(bx, by)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.lineCap = 'round'
  ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(tail.x, tail.y); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(tail.x, tail.y); ctx.stroke()
  ctx.restore()
}

/** Een magneetje: rond, in de teamkleur, met het rugnummer erin. */
export function drawMagnet(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, label: string, r = MAGNET_R) {
  const outline = isLightColor(color) ? '#111111' : '#ffffff'
  ctx.save()
  ctx.fillStyle = 'rgba(0, 0, 0, 0.28)'
  ctx.beginPath(); ctx.ellipse(x + 2, y + 4, r * 1.05, r * 0.9, 0, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = color
  ctx.strokeStyle = outline
  ctx.lineWidth = 2
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
  if (label) {
    ctx.fillStyle = outline
    ctx.font = `bold ${Math.round(r * (label.length > 2 ? 0.75 : 1))}px ui-sans-serif, system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, x, y + 1)
  }
  ctx.restore()
}

export function drawBall(ctx: CanvasRenderingContext2D, x: number, y: number, scale = 1) {
  const r = BALL_R * scale
  ctx.save()
  ctx.fillStyle = C_BALL
  ctx.strokeStyle = '#111111'
  ctx.lineWidth = 2
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
  // Een paar donkere vlakjes, genoeg om het als bal te lezen.
  ctx.fillStyle = '#111111'
  for (const [dx, dy] of [[0, 0], [-0.55, -0.35], [0.55, -0.35], [-0.35, 0.6], [0.35, 0.6]]) {
    ctx.beginPath(); ctx.arc(x + dx * r, y + dy * r, r * 0.22, 0, Math.PI * 2); ctx.fill()
  }
  ctx.restore()
}

/** Een pion van bovenaf: een driehoekje met een lichte band, in de gekozen kleur. */
export function drawCone(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, size: 'small' | 'large') {
  const r = CONE_R[size]
  const outline = isLightColor(color) ? '#111111' : 'rgba(255,255,255,0.85)'
  ctx.save()
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)'
  ctx.beginPath(); ctx.ellipse(x + 1, y + r * 0.9, r * 1.1, r * 0.4, 0, 0, Math.PI * 2); ctx.fill()
  ctx.lineJoin = 'round'
  ctx.fillStyle = color
  ctx.strokeStyle = outline
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(x, y - r * 1.15)
  ctx.lineTo(x + r, y + r * 0.75)
  ctx.lineTo(x - r, y + r * 0.75)
  ctx.closePath()
  ctx.fill(); ctx.stroke()
  // Lichte band, zoals op een echte pion.
  ctx.strokeStyle = 'rgba(255,255,255,0.75)'
  ctx.lineWidth = Math.max(2, r * 0.22)
  ctx.beginPath(); ctx.moveTo(x - r * 0.45, y + r * 0.05); ctx.lineTo(x + r * 0.45, y + r * 0.05); ctx.stroke()
  ctx.restore()
}

/** Een doeltje van bovenaf: wit frame met een net, de opening naar beneden op het scherm. */
export function drawGoal(ctx: CanvasRenderingContext2D, x: number, y: number, size: 'small' | 'large') {
  const { w, d } = GOAL_HALF[size]
  ctx.save()
  ctx.fillStyle = 'rgba(255, 255, 255, 0.22)'
  ctx.fillRect(x - w, y - d, 2 * w, 2 * d)
  // Net: fijne ruitjes.
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)'
  ctx.lineWidth = 1
  const stap = Math.max(4, d / 2)
  ctx.beginPath()
  for (let gx = x - w; gx <= x + w; gx += stap) { ctx.moveTo(gx, y - d); ctx.lineTo(gx, y + d) }
  for (let gy = y - d; gy <= y + d; gy += stap) { ctx.moveTo(x - w, gy); ctx.lineTo(x + w, gy) }
  ctx.stroke()
  // Frame: achterkant en twee palen, de voorkant blijft open.
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = size === 'large' ? 4 : 3
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(x - w, y + d); ctx.lineTo(x - w, y - d); ctx.lineTo(x + w, y - d); ctx.lineTo(x + w, y + d)
  ctx.stroke()
  ctx.restore()
}

export const PULSE_DURATION_MS = 900

/** Uitdijende ringen om een object, om de aandacht ernaartoe te trekken. `phase` loopt van 0 tot 1. */
export function drawPulse(ctx: CanvasRenderingContext2D, x: number, y: number, baseRadius: number, color: string, phase: number) {
  if (phase < 0 || phase > 1) return
  for (let i = 0; i < 3; i++) {
    const localPhase = phase - i * 0.18
    if (localPhase < 0 || localPhase > 1) continue
    const eased = 1 - Math.pow(1 - localPhase, 2)
    const radius = baseRadius + eased * 36
    const alpha = (1 - localPhase) * 0.65
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.strokeStyle = color
    ctx.lineWidth = 3 - eased * 2
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
  }
}

export function drawBallShadow(ctx: CanvasRenderingContext2D, x: number, y: number, spread: number, alpha: number) {
  if (alpha <= 0) return
  ctx.save()
  ctx.globalAlpha = alpha
  const grad = ctx.createRadialGradient(x, y, 1, x, y, 10 + spread)
  grad.addColorStop(0, 'rgba(0,0,0,0.7)')
  grad.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.ellipse(x, y, 10 + spread, 5 + spread * 0.4, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

export function drawTBObject(ctx: CanvasRenderingContext2D, obj: TBObject, x: number, y: number, selected = false, recording = false, scale = 1) {
  if (obj.type === 'player') drawMagnet(ctx, x, y, obj.color, obj.label ?? '')
  else if (obj.type === 'trainer') drawMagnet(ctx, x, y, obj.color, 'T', MAGNET_R * 0.9)
  else if (obj.type === 'ball') drawBall(ctx, x, y, scale)
  else if (obj.type === 'cone') drawCone(ctx, x, y, obj.color, obj.size ?? 'small')
  else if (obj.type === 'goal') drawGoal(ctx, x, y, obj.size ?? 'small')
  if (selected && !recording) {
    ctx.save()
    ctx.strokeStyle = '#facc15'; ctx.lineWidth = 2.5; ctx.setLineDash([5, 4])
    const r = objectRadius(obj) + 8
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke()
    ctx.setLineDash([])
    ctx.restore()
  }
}

/** Een stiftlijn: ronde, vloeiende streek door de middens tussen de punten. */
export function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke, alpha = 1) {
  const pts = stroke.points
  if (pts.length === 0 || alpha <= 0) return
  ctx.save()
  ctx.globalAlpha = alpha * 0.9
  ctx.strokeStyle = stroke.color
  ctx.fillStyle = stroke.color
  ctx.lineWidth = stroke.width
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  if (pts.length === 1) {
    ctx.beginPath(); ctx.arc(pts[0].x, pts[0].y, stroke.width / 2, 0, Math.PI * 2); ctx.fill()
  } else {
    ctx.beginPath()
    ctx.moveTo(pts[0].x, pts[0].y)
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i].x + pts[i + 1].x) / 2
      const my = (pts[i].y + pts[i + 1].y) / 2
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my)
    }
    ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y)
    ctx.stroke()
  }
  ctx.restore()
}

export function drawMotionTrail(ctx: CanvasRenderingContext2D, points: { x: number; y: number }[], color: string) {
  if (points.length < 2) return
  ctx.save()
  for (let i = 1; i < points.length; i++) {
    const t = i / points.length
    ctx.strokeStyle = color
    ctx.globalAlpha = 0.18 + 0.45 * t
    ctx.lineWidth = 2; ctx.setLineDash([4, 6])
    ctx.beginPath(); ctx.moveTo(points[i - 1].x, points[i - 1].y); ctx.lineTo(points[i].x, points[i].y); ctx.stroke()
  }
  ctx.restore()
}
