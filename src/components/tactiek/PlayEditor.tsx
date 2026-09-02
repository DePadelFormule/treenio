'use client'

/**
 * Het tekenbord: magneetjes, pijlen, zones, ballonnen en stift op een veld,
 * met frames die de beweging bepalen. Gecontroleerd via value en onChange,
 * allebei in meters; intern werkt het bord in pixels van het staande canvas.
 */
import { useEffect, useMemo, useRef, useState, useCallback, type ReactNode } from 'react'
import {
  MousePointer2, Users, User as UserIcon, Disc, Square as RectIcon,
  ArrowRight, ArrowUpRight, Route, MoveRight, Type,
  Play, Pause, Square as StopIcon, Plus, Trash2, RotateCcw, ChevronLeft, ChevronRight,
  Video, Circle, Loader2, Unlink, Sparkles, Image as ImageIcon, Footprints, Pin, PinOff,
  Pencil, Eraser, Triangle, Cone, Goal,
} from 'lucide-react'

import type {
  Tool, TBObject, Frame, AnimPos, ZoneColor, Zone, Arrow, TextLabel, Stroke, Selection, PlayData,
} from '@/lib/tactiek/types'
import { isMarker } from '@/lib/tactiek/types'
import {
  PLAY_VERSION, RECORD_FPS, ARROW_VISIBLE_MS, ARROW_FADE_MS, ZONE_STYLE, PULSE_DURATION_MS, MAGNET_R, objectRadius,
  genId, drawBoardCanvas, drawZone, drawZonePreview, drawArrow, textLabelBox, drawTextLabel,
  drawPulse, drawBallShadow, drawTBObject, drawMotionTrail, drawSubtitle, drawStroke,
} from '@/lib/tactiek/render'
import { bordLayout, toCanvasSpace, toMeterSpace, type BordLayout, type VeldSoort } from '@/lib/tactiek/veld'
import {
  bareify, optionAlphaAt, frameAlphaAt, subtitleAt,
  computeTimeline as computeTimelinePure,
  getPositionsAtTime as getPositionsAtTimePure,
} from '@/lib/tactiek/timeline'

type ArrowStyle = NonNullable<Arrow['style']>
const ARROW_TOOLS: Partial<Record<Tool, ArrowStyle>> = { arrow: 'straight', lob: 'lob', run: 'run', option: 'option' }

/** Zones, ballonnen, stift en opties horen bij een frame. Deze helpers houden ze op hun plek als frames verschuiven. */
type FrameBound = { frameIndex?: number }
function isOnFrame(item: FrameBound, frame: number) {
  return item.frameIndex === undefined || item.frameIndex === frame
}
function afterFrameInserted<T extends FrameBound>(items: T[], insertedAfter: number): T[] {
  return items.map(i => i.frameIndex !== undefined && i.frameIndex > insertedAfter ? { ...i, frameIndex: i.frameIndex + 1 } : i)
}
function afterFrameDeleted<T extends FrameBound>(items: T[], deleted: number): T[] {
  return items.flatMap(i => {
    if (i.frameIndex === undefined) return [i]
    if (i.frameIndex === deleted) return []
    return [i.frameIndex > deleted ? { ...i, frameIndex: i.frameIndex - 1 } : i]
  })
}

/** Clubrood en zwart voor de twee teams, wit voor de bal, en accenten voor pijlen en stift. */
const PLAYER_COLORS = ['#C8102E', '#111111', '#ffffff', '#facc15', '#f97316', '#3b82f6', '#ff0099', '#d4af37']
const ZONE_COLORS: ZoneColor[] = ['red', 'green', 'orange']
/** Dikte van de stift en bereik van de veger, in canvas-pixels. */
const STROKE_WIDTH = 8
const ERASER_RADIUS = 22

function pickMimeType(): { mime: string; ext: 'mp4' | 'webm' } | null {
  if (typeof MediaRecorder === 'undefined') return null
  const candidates: { mime: string; ext: 'mp4' | 'webm' }[] = [
    { mime: 'video/mp4;codecs=avc1', ext: 'mp4' },
    { mime: 'video/mp4', ext: 'mp4' },
    { mime: 'video/webm;codecs=vp9', ext: 'webm' },
    { mime: 'video/webm;codecs=vp8', ext: 'webm' },
    { mime: 'video/webm', ext: 'webm' },
  ]
  for (const c of candidates) if (MediaRecorder.isTypeSupported(c.mime)) return c
  return null
}

function emptyFrame(): Frame {
  return { id: genId(), positions: {}, hold_ms: 0 }
}

/** De tekenstaat van het bord, in pixels van het canvas. */
interface Board {
  title: string
  description: string
  objects: TBObject[]
  zones: Zone[]
  arrows: Arrow[]
  texts: TextLabel[]
  strokes: Stroke[]
  frames: Frame[]
}

function toBoard(raw: PlayData, layout: BordLayout): Board {
  const data = toCanvasSpace(raw, layout.projection)
  return {
    title: data.title,
    description: data.description,
    objects: data.objects,
    zones: data.zones,
    arrows: data.arrows,
    texts: data.texts,
    strokes: data.strokes ?? [],
    frames: data.frames.length ? data.frames : [emptyFrame()],
  }
}

export interface PlayEditorProps {
  /** De situatie in meters. Een nieuw object laadt het bord opnieuw. */
  value: PlayData
  /** Wordt na elke bewerking aangeroepen met de situatie in meters. */
  onChange: (data: PlayData) => void
  veld: VeldSoort
  /** Extra knoppen vooraan in de bovenbalk; busy is waar tijdens afspelen of opnemen. */
  toolbarStart?: (state: { busy: boolean }) => ReactNode
}

export default function PlayEditor({ value, onChange, veld, toolbarStart }: PlayEditorProps) {
  const layout = useMemo(() => bordLayout(veld), [veld])
  const { canvasW, canvasH, projection } = layout

  const courtRef = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const overlayCtx = useRef<CanvasRenderingContext2D | null>(null)
  const recCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const playStartRef = useRef<number>(0)

  const [initial] = useState(() => toBoard(value, layout))

  // Persisted state
  const [title, setTitle] = useState(initial.title)
  const [description, setDescription] = useState(initial.description)
  const [objects, setObjects] = useState<TBObject[]>(initial.objects)
  const [zones, setZones] = useState<Zone[]>(initial.zones)
  const [arrows, setArrows] = useState<Arrow[]>(initial.arrows)
  const [texts, setTexts] = useState<TextLabel[]>(initial.texts)
  const [strokes, setStrokes] = useState<Stroke[]>(initial.strokes)
  const [frames, setFrames] = useState<Frame[]>(initial.frames)

  // Editor state
  const [currentFrame, setCurrentFrame] = useState(0)
  const [tool, setTool] = useState<Tool>('select')
  const [playerColor, setPlayerColor] = useState(PLAYER_COLORS[0])
  const [zoneColor, setZoneColor] = useState<ZoneColor>('green')
  const [selection, setSelection] = useState<Selection>(null)
  const [playing, setPlaying] = useState(false)
  const [animTime, setAnimTime] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [showTrails, setShowTrails] = useState(true)
  const [recording, setRecording] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [zoneDraft, setZoneDraft] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [arrowDraft, setArrowDraft] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null)
  const [strokeDraft, setStrokeDraft] = useState<Stroke | null>(null)

  // ===== Gecontroleerd via value en onChange =====
  // We laden een nieuwe value eenmalig in en melden elke bewerking terug. Wat
  // we zelf net gemeld hebben komt als value terug en wordt overgeslagen,
  // anders zou elke bewerking het bord opnieuw laden en de selectie kwijtraken.
  const loadedRef = useRef<Board>(initial)
  const loadedValueRef = useRef(value)
  const lastEmittedRef = useRef<PlayData | null>(null)
  /** De laatst bekende situatie in meters, geladen of gemeld. Voor een herprojectie bij veldwissel. */
  const metersRef = useRef<PlayData>(value)
  const onChangeRef = useRef(onChange)
  useEffect(() => { onChangeRef.current = onChange }, [onChange])

  function loadBoard(raw: PlayData, lay: BordLayout) {
    const board = toBoard(raw, lay)
    loadedRef.current = board
    metersRef.current = raw
    setTitle(board.title)
    setDescription(board.description)
    setObjects(board.objects)
    setZones(board.zones)
    setArrows(board.arrows)
    setTexts(board.texts)
    setStrokes(board.strokes)
    setFrames(board.frames)
    setCurrentFrame(0)
    setSelection(null)
    setPlaying(false)
    setAnimTime(0)
  }

  useEffect(() => {
    if (value === loadedValueRef.current || value === lastEmittedRef.current) return
    loadedValueRef.current = value
    loadBoard(value, layout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  // Ander veld: dezelfde meters, opnieuw geprojecteerd.
  const layoutRef = useRef(layout)
  useEffect(() => {
    if (layoutRef.current === layout) return
    layoutRef.current = layout
    loadBoard(metersRef.current, layout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout])

  useEffect(() => {
    const l = loadedRef.current
    if (
      title === l.title && description === l.description && objects === l.objects &&
      zones === l.zones && arrows === l.arrows && texts === l.texts && strokes === l.strokes && frames === l.frames
    ) return
    const data = toMeterSpace(
      { version: PLAY_VERSION, title, description, objects, zones, arrows, texts, strokes, frames },
      projection,
    )
    lastEmittedRef.current = data
    metersRef.current = data
    onChangeRef.current(data)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, objects, zones, arrows, texts, strokes, frames])

  /** Beeldmaat op het scherm: het hele canvas passend in de beschikbare ruimte. */
  const stageRef = useRef<HTMLDivElement>(null)
  const [stage, setStage] = useState({ w: canvasW, h: canvasH })

  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const fit = () => {
      const style = getComputedStyle(el)
      const padX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight)
      const padY = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom)
      const w = el.clientWidth - padX
      const h = el.clientHeight - padY
      if (w <= 0 || h <= 0) return
      const scale = Math.min(w / canvasW, h / canvasH)
      setStage({ w: Math.round(canvasW * scale), h: Math.round(canvasH * scale) })
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [canvasW, canvasH])

  const dragMode = useRef<'none' | 'drag-object' | 'drag-arrow-end' | 'drag-arrow-start' | 'drag-text' | 'drag-text-tail' | 'draw-zone' | 'draw-arrow' | 'draw-stroke' | 'erase'>('none')

  const selectedObjectId = selection?.kind === 'object' ? selection.id : null
  const selectedZoneId = selection?.kind === 'zone' ? selection.id : null
  const selectedArrowId = selection?.kind === 'arrow' ? selection.id : null
  const selectedTextId = selection?.kind === 'text' ? selection.id : null

  // ===== Geometry: het veld inclusief de rand gras =====
  const { courtX, courtY, courtW, courtH } = projection
  function clampToCourt(pos: { x: number; y: number }) {
    const m = MAGNET_R + 2
    return {
      x: Math.max(courtX + m, Math.min(courtX + courtW - m, pos.x)),
      y: Math.max(courtY + m, Math.min(courtY + courtH - m, pos.y)),
    }
  }
  function clampPointToCourt(pos: { x: number; y: number }) {
    return {
      x: Math.max(courtX, Math.min(courtX + courtW, pos.x)),
      y: Math.max(courtY, Math.min(courtY + courtH, pos.y)),
    }
  }
  function inCourtArea(pos: { x: number; y: number }) {
    return pos.x >= courtX && pos.x <= courtX + courtW && pos.y >= courtY && pos.y <= courtY + courtH
  }

  function computeTimeline() {
    return computeTimelinePure(frames, speed)
  }
  function getPositionsAtTime(elapsed: number): Record<string, AnimPos> {
    return getPositionsAtTimePure(frames, objects, arrows, elapsed, speed)
  }

  // ===== Overlay rendering =====
  function drawOverlay(ctx: CanvasRenderingContext2D, positions: Record<string, AnimPos>) {
    ctx.clearRect(0, 0, canvasW, canvasH)

    // Wat bij een frame hoort is in de editor alleen op dat frame te zien;
    // tijdens afspelen bepaalt de tijdlijn hoe zichtbaar het is.
    const liveTimeline = playing ? computeTimeline() : null
    const liveTotal = liveTimeline?.[liveTimeline.length - 1]?.transitionEnd ?? 0
    const wrapped = liveTotal > 0 ? ((animTime % liveTotal) + liveTotal) % liveTotal : 0
    const live = !!liveTimeline && liveTotal > 0
    const frameAlpha = (item: FrameBound) =>
      live ? frameAlphaAt(item.frameIndex, liveTimeline!, wrapped) : isOnFrame(item, currentFrame) ? 1 : 0
    const withAlpha = (alpha: number, draw: () => void) => {
      if (alpha <= 0) return
      ctx.save(); ctx.globalAlpha = alpha; draw(); ctx.restore()
    }

    for (const z of zones) withAlpha(frameAlpha(z), () => drawZone(ctx, z, !playing && !recording && selectedZoneId === z.id))
    if (zoneDraft && tool === 'zone' && dragMode.current === 'draw-zone') {
      const x = zoneDraft.w < 0 ? zoneDraft.x + zoneDraft.w : zoneDraft.x
      const y = zoneDraft.h < 0 ? zoneDraft.y + zoneDraft.h : zoneDraft.y
      drawZonePreview(ctx, x, y, Math.abs(zoneDraft.w), Math.abs(zoneDraft.h), zoneColor)
    }
    if (showTrails && frames.length > 1) {
      for (const obj of objects) {
        if (isMarker(obj)) continue
        const points = frames.map(f => f.positions[obj.id]).filter(Boolean) as { x: number; y: number }[]
        drawMotionTrail(ctx, points, obj.color)
      }
    }
    const arrowAlpha = (() => {
      if (!playing) return 1
      const t = animTime % 5000
      if (t <= ARROW_VISIBLE_MS) return 1
      if (t <= ARROW_VISIBLE_MS + ARROW_FADE_MS) return 1 - (t - ARROW_VISIBLE_MS) / ARROW_FADE_MS
      return 0
    })()
    for (const a of arrows) {
      let alpha = arrowAlpha
      if (a.style === 'option') {
        alpha = live ? optionAlphaAt(a, liveTimeline!, wrapped) : (a.frameIndex ?? 0) === currentFrame ? 1 : 0
      }
      drawArrow(ctx, a, !playing && !recording && selectedArrowId === a.id, alpha)
    }
    const draftStyle = ARROW_TOOLS[tool]
    if (arrowDraft && draftStyle && dragMode.current === 'draw-arrow') {
      drawArrow(ctx, { id: 'preview', color: playerColor, style: draftStyle, ...arrowDraft }, false, 1)
    }
    for (const obj of objects) {
      const p = positions[obj.id]
      if (!p?.shadow) continue
      drawBallShadow(ctx, p.shadow.x, p.shadow.y, p.shadow.spread, p.shadow.alpha)
    }

    const pulsesNow: { obj: TBObject; pos: AnimPos; phase: number; color: string }[] = []
    if (live) {
      for (let i = 0; i < frames.length; i++) {
        const within = wrapped - liveTimeline![i].start
        if (within >= 0 && within <= PULSE_DURATION_MS) {
          const phase = within / PULSE_DURATION_MS
          for (const hid of frames[i].highlights ?? []) {
            const obj = objects.find(o => o.id === hid)
            const p = obj ? positions[obj.id] : undefined
            if (obj && p) pulsesNow.push({ obj, pos: p, phase, color: obj.color })
          }
        }
      }
    } else if (!playing) {
      for (const hid of frames[currentFrame]?.highlights ?? []) {
        const obj = objects.find(o => o.id === hid)
        const p = obj ? positions[obj.id] : undefined
        if (obj && p) pulsesNow.push({ obj, pos: p, phase: 0.3, color: obj.color })
      }
    }
    for (const pl of pulsesNow) drawPulse(ctx, pl.pos.x, pl.pos.y, objectRadius(pl.obj), pl.color, pl.phase)

    for (const obj of objects) {
      const p = positions[obj.id]
      if (!p) continue
      if (!playing && !recording) {
        const linkedArrow = arrows.find(ar => ar.attachedObjectId === obj.id && ar.frameIndex === currentFrame)
        if (linkedArrow) {
          ctx.save()
          ctx.strokeStyle = linkedArrow.color
          ctx.lineWidth = 1.5
          ctx.globalAlpha = 0.7
          ctx.beginPath(); ctx.arc(p.x, p.y, objectRadius(obj) + 5, 0, Math.PI * 2); ctx.stroke()
          ctx.restore()
        }
      }
      drawTBObject(ctx, obj, p.x, p.y, !playing && selectedObjectId === obj.id, recording, p.scale ?? 1)
    }
    for (const s of strokes) drawStroke(ctx, s, frameAlpha(s))
    if (strokeDraft) drawStroke(ctx, strokeDraft, 1)
    for (const t of texts) withAlpha(frameAlpha(t), () => drawTextLabel(ctx, t, !playing && !recording && selectedTextId === t.id))

    const subtitle = live ? subtitleAt(frames, liveTimeline!, wrapped) : (frames[currentFrame]?.text?.trim() ?? '')
    drawSubtitle(ctx, subtitle, canvasW / 2, courtY + courtH - 30, courtW - 90, 32)
  }

  const redraw = useCallback(() => {
    const ctx = overlayCtx.current
    if (!ctx) return
    const positions: Record<string, AnimPos> = playing
      ? getPositionsAtTime(animTime)
      : bareify(frames[currentFrame]?.positions ?? {})
    drawOverlay(ctx, positions)
    if (recording && recCanvasRef.current && courtRef.current && overlayRef.current) {
      const recCtx = recCanvasRef.current.getContext('2d')
      if (recCtx) {
        recCtx.drawImage(courtRef.current, 0, 0)
        recCtx.drawImage(overlayRef.current, 0, 0)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objects, zones, arrows, texts, strokes, zoneDraft, arrowDraft, strokeDraft, frames, currentFrame, selection, playing, animTime, showTrails, speed, recording, tool, zoneColor, playerColor, layout])

  useEffect(() => {
    if (courtRef.current) drawBoardCanvas(courtRef.current, layout, title, description)
    if (overlayRef.current) {
      overlayCtx.current = overlayRef.current.getContext('2d')
      redraw()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, layout])

  useEffect(() => { redraw() }, [redraw])

  useEffect(() => {
    if (!playing) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      return
    }
    playStartRef.current = performance.now() - animTime
    const step = () => {
      setAnimTime(performance.now() - playStartRef.current)
      animFrameRef.current = requestAnimationFrame(step)
    }
    animFrameRef.current = requestAnimationFrame(step)
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing])

  // ===== Pointer helpers =====
  function getPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = overlayRef.current!.getBoundingClientRect()
    return { x: (e.clientX - rect.left) * (canvasW / rect.width), y: (e.clientY - rect.top) * (canvasH / rect.height) }
  }

  function findObjectAt(x: number, y: number): TBObject | null {
    const positions = frames[currentFrame]?.positions ?? {}
    for (let i = objects.length - 1; i >= 0; i--) {
      const obj = objects[i]
      const p = positions[obj.id]
      if (!p) continue
      if (Math.hypot(x - p.x, y - p.y) <= objectRadius(obj) + 5) return obj
    }
    return null
  }
  function findZoneAt(x: number, y: number): Zone | null {
    for (let i = zones.length - 1; i >= 0; i--) {
      const z = zones[i]
      if (!isOnFrame(z, currentFrame)) continue
      if (x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h) return z
    }
    return null
  }
  function findArrowAt(x: number, y: number): { arrow: Arrow; endpoint: 'start' | 'end' | 'line' } | null {
    for (let i = arrows.length - 1; i >= 0; i--) {
      const a = arrows[i]
      if (a.style === 'option' && (a.frameIndex ?? 0) !== currentFrame) continue
      if (Math.hypot(x - a.x1, y - a.y1) <= 10) return { arrow: a, endpoint: 'start' }
      if (Math.hypot(x - a.x2, y - a.y2) <= 10) return { arrow: a, endpoint: 'end' }
      const dx = a.x2 - a.x1, dy = a.y2 - a.y1
      const len2 = dx * dx + dy * dy
      if (len2 === 0) continue
      const t = Math.max(0, Math.min(1, ((x - a.x1) * dx + (y - a.y1) * dy) / len2))
      if (Math.hypot(x - (a.x1 + t * dx), y - (a.y1 + t * dy)) <= 8) return { arrow: a, endpoint: 'line' }
    }
    return null
  }
  function findTextAt(x: number, y: number, ctx: CanvasRenderingContext2D): TextLabel | null {
    for (let i = texts.length - 1; i >= 0; i--) {
      const t = texts[i]
      if (!isOnFrame(t, currentFrame)) continue
      const { w, h } = textLabelBox(ctx, t)
      if (x >= t.x - w / 2 && x <= t.x + w / 2 && y >= t.y - h / 2 && y <= t.y + h / 2) return t
    }
    return null
  }
  function findTailAt(x: number, y: number): TextLabel | null {
    for (let i = texts.length - 1; i >= 0; i--) {
      const t = texts[i]
      if (!isOnFrame(t, currentFrame)) continue
      if (t.tail && Math.hypot(t.tail.x - x, t.tail.y - y) <= 16) return t
    }
    return null
  }

  function addObject(type: TBObject['type'], pos: { x: number; y: number }, size?: TBObject['size']) {
    const clamped = clampToCourt(pos)
    // Rugnummer: doortellen binnen dezelfde kleur, zodat elk team bij 1 begint.
    const label = type === 'player' ? String(objects.filter(o => o.type === 'player' && o.color === playerColor).length + 1) : undefined
    const obj: TBObject = { id: genId(), type, color: playerColor, label, ...(size ? { size } : {}) }
    setObjects(prev => [...prev, obj])
    setFrames(prev => prev.map(f => ({ ...f, positions: { ...f.positions, [obj.id]: clamped } })))
    setSelection({ kind: 'object', id: obj.id })
  }

  function handleStart(pos: { x: number; y: number }) {
    if (playing || recording) return
    const ctx = overlayCtx.current

    if (tool === 'select') {
      const hitTail = findTailAt(pos.x, pos.y)
      if (hitTail) { setSelection({ kind: 'text', id: hitTail.id }); dragMode.current = 'drag-text-tail'; return }
      const hitObj = findObjectAt(pos.x, pos.y)
      if (hitObj) { setSelection({ kind: 'object', id: hitObj.id }); dragMode.current = 'drag-object'; return }
      const hitText = ctx ? findTextAt(pos.x, pos.y, ctx) : null
      if (hitText) { setSelection({ kind: 'text', id: hitText.id }); dragMode.current = 'drag-text'; return }
      const hitArrow = findArrowAt(pos.x, pos.y)
      if (hitArrow) {
        setSelection({ kind: 'arrow', id: hitArrow.arrow.id })
        dragMode.current = hitArrow.endpoint === 'start' ? 'drag-arrow-start' : hitArrow.endpoint === 'end' ? 'drag-arrow-end' : 'none'
        return
      }
      const hitZone = findZoneAt(pos.x, pos.y)
      if (hitZone) { setSelection({ kind: 'zone', id: hitZone.id }); dragMode.current = 'none'; return }
      setSelection(null)
      return
    }

    // Stift en veger werken over het hele beeld, ook naast het veld.
    if (tool === 'pen') {
      setStrokeDraft({ id: genId(), color: playerColor, width: STROKE_WIDTH, points: [pos], frameIndex: currentFrame })
      dragMode.current = 'draw-stroke'
      setSelection(null)
      return
    }
    if (tool === 'eraser') {
      eraseAt(pos)
      dragMode.current = 'erase'
      setSelection(null)
      return
    }

    if (!inCourtArea(pos)) return

    if (tool === 'zone') {
      const c = clampPointToCourt(pos)
      setZoneDraft({ x: c.x, y: c.y, w: 0, h: 0 })
      dragMode.current = 'draw-zone'
      setSelection(null)
      return
    }
    if (ARROW_TOOLS[tool]) {
      const c = clampPointToCourt(pos)
      setArrowDraft({ x1: c.x, y1: c.y, x2: c.x, y2: c.y })
      dragMode.current = 'draw-arrow'
      setSelection(null)
      return
    }
    if (tool === 'text') {
      const input = prompt('Tekst:', '')
      if (input && input.trim()) {
        const boven = pos.y - courtH * 0.12
        const t: TextLabel = {
          id: genId(),
          x: pos.x,
          y: boven > courtY + 60 ? boven : pos.y + courtH * 0.12,
          text: input.trim(),
          color: playerColor,
          tail: { x: pos.x, y: pos.y },
          frameIndex: currentFrame,
        }
        setTexts(prev => [...prev, t])
        setSelection({ kind: 'text', id: t.id })
      }
      return
    }
    if (tool === 'player') addObject('player', pos)
    else if (tool === 'trainer') addObject('trainer', pos)
    else if (tool === 'ball') addObject('ball', pos)
    else if (tool === 'cone') addObject('cone', pos, 'small')
    else if (tool === 'cone_big') addObject('cone', pos, 'large')
    else if (tool === 'goal') addObject('goal', pos, 'small')
    else if (tool === 'goal_big') addObject('goal', pos, 'large')
  }

  /** Veegt elke stiftlijn van dit frame weg die onder de veger ligt, ook midden op een lange streek. */
  function eraseAt(pos: { x: number; y: number }) {
    const raakt = (s: Stroke) => {
      const bereik = ERASER_RADIUS + s.width / 2
      const pts = s.points
      if (pts.length === 1) return Math.hypot(pts[0].x - pos.x, pts[0].y - pos.y) <= bereik
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i]
        const dx = b.x - a.x, dy = b.y - a.y
        const len2 = dx * dx + dy * dy
        const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((pos.x - a.x) * dx + (pos.y - a.y) * dy) / len2))
        if (Math.hypot(a.x + t * dx - pos.x, a.y + t * dy - pos.y) <= bereik) return true
      }
      return false
    }
    setStrokes(prev => prev.filter(s => !isOnFrame(s, currentFrame) || !raakt(s)))
  }

  function handleMove(pos: { x: number; y: number }) {
    if (dragMode.current === 'draw-stroke' && strokeDraft) {
      const last = strokeDraft.points[strokeDraft.points.length - 1]
      if (Math.hypot(pos.x - last.x, pos.y - last.y) < 3) return
      setStrokeDraft({ ...strokeDraft, points: [...strokeDraft.points, pos] })
      return
    }
    if (dragMode.current === 'erase') { eraseAt(pos); return }
    if (dragMode.current === 'drag-object' && selectedObjectId) {
      const clamped = clampToCourt(pos)
      setFrames(prev => prev.map((f, i) =>
        i === currentFrame ? { ...f, positions: { ...f.positions, [selectedObjectId]: clamped } } : f
      ))
      // Een pijl die aan dit object vastzit volgt mee.
      setArrows(prev => prev.map(a => {
        if (a.attachedObjectId !== selectedObjectId) return a
        if (a.frameIndex === currentFrame) return { ...a, x1: clamped.x, y1: clamped.y }
        if (a.frameIndex === currentFrame - 1) return { ...a, x2: clamped.x, y2: clamped.y }
        return a
      }))
    } else if (dragMode.current === 'draw-zone' && zoneDraft) {
      const c = clampPointToCourt(pos)
      setZoneDraft({ ...zoneDraft, w: c.x - zoneDraft.x, h: c.y - zoneDraft.y })
    } else if (dragMode.current === 'draw-arrow' && arrowDraft) {
      const c = clampPointToCourt(pos)
      setArrowDraft({ ...arrowDraft, x2: c.x, y2: c.y })
    } else if (dragMode.current === 'drag-arrow-start' && selectedArrowId) {
      const c = clampPointToCourt(pos)
      setArrows(prev => prev.map(a => a.id === selectedArrowId ? { ...a, x1: c.x, y1: c.y } : a))
      const arrow = arrows.find(a => a.id === selectedArrowId)
      if (arrow?.attachedObjectId && arrow.frameIndex !== undefined) {
        const objId = arrow.attachedObjectId, fi = arrow.frameIndex
        setFrames(prev => prev.map((f, i) => i === fi ? { ...f, positions: { ...f.positions, [objId]: { x: c.x, y: c.y } } } : f))
      }
    } else if (dragMode.current === 'drag-arrow-end' && selectedArrowId) {
      const c = clampPointToCourt(pos)
      setArrows(prev => prev.map(a => a.id === selectedArrowId ? { ...a, x2: c.x, y2: c.y } : a))
      const arrow = arrows.find(a => a.id === selectedArrowId)
      if (arrow?.attachedObjectId && arrow.frameIndex !== undefined) {
        const objId = arrow.attachedObjectId, fi = arrow.frameIndex + 1
        setFrames(prev => prev.map((f, i) => i === fi ? { ...f, positions: { ...f.positions, [objId]: { x: c.x, y: c.y } } } : f))
      }
    } else if (dragMode.current === 'drag-text' && selectedTextId) {
      setTexts(prev => prev.map(t => t.id === selectedTextId ? { ...t, x: pos.x, y: pos.y } : t))
    } else if (dragMode.current === 'drag-text-tail' && selectedTextId) {
      setTexts(prev => prev.map(t => t.id === selectedTextId ? { ...t, tail: { x: pos.x, y: pos.y } } : t))
    }
  }

  function handleEnd() {
    if (dragMode.current === 'draw-stroke' && strokeDraft) {
      setStrokes(prev => [...prev, strokeDraft])
      setStrokeDraft(null)
    } else if (dragMode.current === 'draw-zone' && zoneDraft) {
      const x = zoneDraft.w < 0 ? zoneDraft.x + zoneDraft.w : zoneDraft.x
      const y = zoneDraft.h < 0 ? zoneDraft.y + zoneDraft.h : zoneDraft.y
      const w = Math.abs(zoneDraft.w), h = Math.abs(zoneDraft.h)
      if (w > 20 && h > 20) {
        const nz: Zone = { id: genId(), color: zoneColor, x, y, w, h, frameIndex: currentFrame }
        setZones(prev => [...prev, nz])
        setSelection({ kind: 'zone', id: nz.id })
      }
      setZoneDraft(null)
    } else if (dragMode.current === 'draw-arrow' && arrowDraft) {
      const d = Math.hypot(arrowDraft.x2 - arrowDraft.x1, arrowDraft.y2 - arrowDraft.y1)
      if (d > 20) {
        const style: ArrowStyle = ARROW_TOOLS[tool] ?? 'straight'
        // Een lob kan alleen aan een bal vastzitten, een looplijn alleen aan
        // een speler of trainer, een rechte pijl aan alles. Een optie-lijn
        // zit nergens aan vast: hij toont een mogelijkheid, geen beweging.
        const positions = frames[currentFrame]?.positions ?? {}
        let nearestObj: TBObject | null = null
        let nearestDist = style === 'option' ? -1 : 60
        for (const obj of objects) {
          if (isMarker(obj)) continue
          if (style === 'lob' && obj.type !== 'ball') continue
          if (style === 'run' && obj.type === 'ball') continue
          const p = positions[obj.id]
          if (!p) continue
          const dd = Math.hypot(arrowDraft.x1 - p.x, arrowDraft.y1 - p.y)
          if (dd < nearestDist) { nearestDist = dd; nearestObj = obj }
        }
        let { x1, y1 } = arrowDraft
        const { x2, y2 } = arrowDraft
        if (nearestObj) { const p = positions[nearestObj.id]; x1 = p.x; y1 = p.y }

        const na: Arrow = {
          id: genId(), color: playerColor, style, x1, y1, x2, y2,
          attachedObjectId: nearestObj?.id,
          frameIndex: nearestObj || style === 'option' ? currentFrame : undefined,
        }
        // Vastgemaakt: zorg dat er een volgend frame is en zet het object daar op de pijlpunt.
        if (nearestObj) {
          setFrames(prev => {
            let next = prev
            if (currentFrame >= prev.length - 1) {
              next = [...prev, { id: genId(), positions: { ...prev[currentFrame].positions }, hold_ms: 0 }]
            }
            return next.map((f, i) =>
              i === currentFrame + 1 ? { ...f, positions: { ...f.positions, [nearestObj!.id]: { x: x2, y: y2 } } } : f
            )
          })
        }
        setArrows(prev => [...prev, na])
        setSelection({ kind: 'arrow', id: na.id })
      }
      setArrowDraft(null)
    }
    dragMode.current = 'none'
  }

  function deleteSelected() {
    if (!selection) return
    if (selection.kind === 'object') {
      const id = selection.id
      setObjects(prev => prev.filter(o => o.id !== id))
      setFrames(prev => prev.map(f => {
        const next = { ...f.positions }; delete next[id]
        return { ...f, positions: next }
      }))
      setArrows(prev => prev.map(a => a.attachedObjectId === id ? { ...a, attachedObjectId: undefined, frameIndex: undefined } : a))
    } else if (selection.kind === 'zone') {
      setZones(prev => prev.filter(z => z.id !== selection.id))
    } else if (selection.kind === 'arrow') {
      setArrows(prev => prev.filter(a => a.id !== selection.id))
    } else if (selection.kind === 'text') {
      setTexts(prev => prev.filter(t => t.id !== selection.id))
    }
    setSelection(null)
  }

  function addFrame() {
    const current = frames[currentFrame]
    const newFrame: Frame = { id: genId(), positions: { ...current.positions }, hold_ms: 0 }
    setFrames(prev => [...prev.slice(0, currentFrame + 1), newFrame, ...prev.slice(currentFrame + 1)])
    setZones(prev => afterFrameInserted(prev, currentFrame))
    setTexts(prev => afterFrameInserted(prev, currentFrame))
    setStrokes(prev => afterFrameInserted(prev, currentFrame))
    setArrows(prev => prev.map(a => a.style === 'option' ? afterFrameInserted([a], currentFrame)[0] : a))
    setCurrentFrame(currentFrame + 1)
  }

  function deleteFrame() {
    if (frames.length === 1) return
    setFrames(prev => prev.filter((_, i) => i !== currentFrame))
    setZones(prev => afterFrameDeleted(prev, currentFrame))
    setTexts(prev => afterFrameDeleted(prev, currentFrame))
    setStrokes(prev => afterFrameDeleted(prev, currentFrame))
    setArrows(prev => prev.flatMap(a => a.style === 'option' ? afterFrameDeleted([a], currentFrame) : [a]))
    setCurrentFrame(Math.max(0, currentFrame - 1))
  }

  /** Zet de geselecteerde zone of ballon vast op alle frames, of juist alleen op dit frame. */
  function togglePinned() {
    if (selection?.kind === 'zone') {
      setZones(prev => prev.map(z => z.id === selection.id ? { ...z, frameIndex: z.frameIndex === undefined ? currentFrame : undefined } : z))
    } else if (selection?.kind === 'text') {
      setTexts(prev => prev.map(t => t.id === selection.id ? { ...t, frameIndex: t.frameIndex === undefined ? currentFrame : undefined } : t))
    }
  }

  function clearAll() {
    if (!confirm('Alles wissen (spelers, zones, pijlen, teksten, frames)?')) return
    setObjects([]); setZones([]); setArrows([]); setTexts([]); setStrokes([])
    setFrames([emptyFrame()])
    setCurrentFrame(0)
    setSelection(null)
    setPlaying(false)
    setAnimTime(0)
  }

  function togglePlay() {
    if (frames.length < 2) { alert('Voeg eerst minimaal 2 frames toe.'); return }
    setSelection(null)
    setPlaying(p => !p)
  }
  function stopPlay() { setPlaying(false); setAnimTime(0) }

  function bestandsnaam(ext: string) {
    const naam = (title || 'spelsituatie').replace(/[^\w -]+/g, '').trim() || 'spelsituatie'
    return `${naam}.${ext}`
  }

  /** Zet het huidige frame als PNG op de schijf. */
  function downloadImage() {
    setSelection(null)
    setExporting(true)
    setTimeout(() => {
      try {
        const court = courtRef.current
        const overlay = overlayRef.current
        if (!court || !overlay) return
        const out = document.createElement('canvas')
        out.width = canvasW
        out.height = canvasH
        const ctx = out.getContext('2d')
        if (!ctx) return
        ctx.drawImage(court, 0, 0)
        ctx.drawImage(overlay, 0, 0)
        out.toBlob(blob => {
          if (!blob) return
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = bestandsnaam('png')
          document.body.appendChild(a); a.click(); document.body.removeChild(a)
          URL.revokeObjectURL(url)
        }, 'image/png')
      } finally {
        setExporting(false)
      }
    }, 80)
  }

  async function startRecording() {
    if (frames.length < 2) { alert('Voeg eerst minimaal 2 frames toe om een filmpje te maken.'); return }
    const mime = pickMimeType()
    if (!mime) { alert('Je browser ondersteunt geen video-opname. Probeer Chrome of Safari.'); return }
    const rec = document.createElement('canvas')
    rec.width = canvasW; rec.height = canvasH
    recCanvasRef.current = rec
    const recCtx = rec.getContext('2d')!
    if (courtRef.current) recCtx.drawImage(courtRef.current, 0, 0)
    const stream = rec.captureStream(RECORD_FPS)
    const recorder = new MediaRecorder(stream, { mimeType: mime.mime, videoBitsPerSecond: 6_000_000 })
    const chunks: BlobPart[] = []
    recorder.ondataavailable = e => { if (e.data && e.data.size > 0) chunks.push(e.data) }
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mime.mime })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = bestandsnaam(mime.ext)
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      URL.revokeObjectURL(url)
      recCanvasRef.current = null
      setRecording(false)
    }
    setRecording(true)
    setSelection(null)
    setAnimTime(0)
    recorder.start()
    setPlaying(true)
    const timeline = computeTimeline()
    const duration = timeline[timeline.length - 1].transitionEnd + 500
    setTimeout(() => {
      setPlaying(false); setAnimTime(0)
      setTimeout(() => { try { recorder.stop() } catch {} }, 200)
    }, duration)
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selection) { e.preventDefault(); deleteSelected() }
      } else if (e.key === 'Escape') {
        setSelection(null)
      } else if (e.key === ' ') {
        e.preventDefault(); togglePlay()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection, frames.length])

  const tools: { id: Tool; icon: React.ElementType; label: string; badge?: string }[] = [
    { id: 'select', icon: MousePointer2, label: 'Selecteer' },
    { id: 'player', icon: Users, label: 'Speler (magneetje in de gekozen kleur)' },
    { id: 'trainer', icon: UserIcon, label: 'Trainer' },
    { id: 'ball', icon: Disc, label: 'Bal' },
    { id: 'cone', icon: Triangle, label: 'Pion klein (in de gekozen kleur)', badge: 'S' },
    { id: 'cone_big', icon: Cone, label: 'Pion groot (in de gekozen kleur)', badge: 'L' },
    { id: 'goal', icon: Goal, label: 'Doeltje klein', badge: 'S' },
    { id: 'goal_big', icon: Goal, label: 'Doeltje groot', badge: 'L' },
    { id: 'arrow', icon: ArrowRight, label: 'Pass of pijl' },
    { id: 'lob', icon: ArrowUpRight, label: 'Hoge bal' },
    { id: 'run', icon: Route, label: 'Looplijn (gestippeld)' },
    { id: 'option', icon: MoveRight, label: 'Optie-lijn: vaag, hoort bij dit frame en verdwijnt na 2 seconden' },
    { id: 'zone', icon: RectIcon, label: 'Zone (sleep)' },
    { id: 'text', icon: Type, label: 'Tekstballon' },
    { id: 'pen', icon: Pencil, label: 'Stift: vrij tekenen op dit frame' },
    { id: 'eraser', icon: Eraser, label: 'Veger: sleep over een stiftlijn om hem weg te halen' },
  ]

  const strokesOnFrame = strokes.filter(s => isOnFrame(s, currentFrame)).length
  const interactionDisabled = playing || recording
  const currentHold = frames[currentFrame]?.hold_ms ?? 0
  const currentSlowIn = frames[currentFrame]?.slow_in ?? 1
  const currentText = frames[currentFrame]?.text ?? ''
  const currentHighlights = frames[currentFrame]?.highlights ?? []
  const isSelectedHighlighted = selection?.kind === 'object' && currentHighlights.includes(selection.id)

  function toggleHighlightForSelected() {
    if (selection?.kind !== 'object') return
    const id = selection.id
    setFrames(prev => prev.map((f, i) => {
      if (i !== currentFrame) return f
      const current = f.highlights ?? []
      return { ...f, highlights: current.includes(id) ? current.filter(x => x !== id) : [...current, id] }
    }))
  }

  const knopklein = 'w-9 h-9 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30 flex-shrink-0'

  return (
    <div className="flex flex-col h-full bg-neutral-950 text-white">
      {/* Bovenbalk: bestand, titel en uitleg, weergave en export. */}
      <div className="bg-neutral-900 border-b border-neutral-800 px-3 py-2 flex items-center gap-2 flex-wrap flex-shrink-0">
        {toolbarStart && (
          <>
            {toolbarStart({ busy: interactionDisabled })}
            <div className="w-px h-6 bg-neutral-800 hidden sm:block" />
          </>
        )}
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Titel"
          maxLength={60}
          className="bg-neutral-800 text-white text-sm placeholder:text-neutral-500 px-3 py-1.5 rounded-lg border border-neutral-700 focus:border-sparta focus:outline-none w-full sm:w-52 flex-shrink-0"
        />
        <input
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Korte uitleg"
          maxLength={140}
          className="bg-neutral-800 text-white text-sm placeholder:text-neutral-500 px-3 py-1.5 rounded-lg border border-neutral-700 focus:border-sparta focus:outline-none w-full sm:flex-1 sm:min-w-[10rem]"
        />
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={() => setShowTrails(v => !v)}
            title="Bewegingsspoor tonen"
            className={`${knopklein} ${showTrails ? 'bg-neutral-800 text-green-400' : 'text-neutral-500 hover:bg-neutral-800 hover:text-white'}`}
          >
            <Footprints className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={downloadImage}
            disabled={interactionDisabled || exporting}
            title="Huidige frame opslaan als afbeelding"
            className="flex items-center gap-1.5 px-2.5 h-9 rounded-lg text-sm font-medium text-neutral-300 bg-neutral-800 hover:bg-sparta hover:text-white transition-colors disabled:opacity-40"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
            <span className="hidden xl:inline">Afbeelding</span>
          </button>
          <button
            type="button"
            onClick={startRecording}
            disabled={recording || frames.length < 2}
            title="Video opnemen (mp4 of webm)"
            className={`flex items-center gap-1.5 px-2.5 h-9 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 ${recording ? 'bg-red-600 text-white' : 'bg-neutral-800 text-neutral-300 hover:bg-red-600 hover:text-white'}`}
          >
            {recording ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
            <span className="hidden xl:inline">{recording ? 'Opnemen…' : 'Video'}</span>
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex">
        {/* Zijbalk met het gereedschap. */}
        <div className="w-14 bg-neutral-900 border-r border-neutral-800 flex flex-col items-center gap-0.5 py-2 flex-shrink-0 overflow-y-auto">
          {tools.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => { setTool(t.id); setSelection(null) }}
              disabled={interactionDisabled}
              title={t.label}
              className={`${knopklein} relative ${tool === t.id ? 'bg-sparta text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}
            >
              <t.icon className="w-4 h-4" />
              {t.badge && <span className="absolute -bottom-0.5 -right-0.5 text-[8px] leading-none font-bold bg-neutral-700 text-neutral-200 rounded px-0.5 py-px">{t.badge}</span>}
            </button>
          ))}

          <div className="w-7 h-px bg-neutral-800 my-1 flex-shrink-0" />

          {tool === 'zone' ? (
            <div className="grid grid-cols-2 gap-1.5 flex-shrink-0">
              {ZONE_COLORS.map(c => {
                const style = ZONE_STYLE[c]
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setZoneColor(c)}
                    title="Zonekleur"
                    className={`w-6 h-6 rounded border-2 transition-all ${zoneColor === c ? 'border-white scale-110' : 'border-neutral-700'}`}
                    style={{ background: `repeating-linear-gradient(45deg, ${style.hatch} 0 3px, ${style.fill} 3px 7px)`, boxShadow: zoneColor === c ? `0 0 10px ${style.stroke}` : undefined }}
                  />
                )
              })}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-1.5 flex-shrink-0">
              {PLAYER_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setPlayerColor(c)}
                  title="Kleur"
                  className={`w-6 h-6 rounded-full border-2 transition-all ${playerColor === c ? 'border-white scale-110' : 'border-neutral-700'}`}
                  style={{ backgroundColor: c, boxShadow: playerColor === c ? `0 0 12px ${c}` : undefined }}
                />
              ))}
            </div>
          )}

          <div className="w-7 h-px bg-neutral-800 my-1 flex-shrink-0" />

          {(() => {
            let linkedArrow: Arrow | undefined
            if (selection?.kind === 'arrow') linkedArrow = arrows.find(a => a.id === selection.id && a.attachedObjectId)
            else if (selection?.kind === 'object') linkedArrow = arrows.find(a => a.attachedObjectId === selection.id)
            if (!linkedArrow) return null
            const arr = linkedArrow
            return (
              <button
                type="button"
                onClick={() => setArrows(prev => prev.map(a => a.id === arr.id ? { ...a, attachedObjectId: undefined, frameIndex: undefined } : a))}
                disabled={interactionDisabled}
                title="Pijl loskoppelen van het magneetje"
                className={`${knopklein} text-neutral-400 hover:bg-neutral-800 hover:text-amber-300`}
              >
                <Unlink className="w-4 h-4" />
              </button>
            )
          })()}
          {(() => {
            const item = selection?.kind === 'zone'
              ? zones.find(z => z.id === selection.id)
              : selection?.kind === 'text' ? texts.find(t => t.id === selection.id) : undefined
            if (!item) return null
            const pinned = item.frameIndex === undefined
            return (
              <button
                type="button"
                onClick={togglePinned}
                disabled={interactionDisabled}
                title={pinned ? 'Staat op alle frames. Klik om alleen op dit frame te tonen.' : 'Alleen op dit frame. Klik om op alle frames te tonen.'}
                className={`${knopklein} ${pinned ? 'bg-neutral-800 text-amber-300' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}
              >
                {pinned ? <Pin className="w-4 h-4" /> : <PinOff className="w-4 h-4" />}
              </button>
            )
          })()}
          {strokesOnFrame > 0 && (
            <button
              type="button"
              onClick={() => setStrokes(prev => prev.filter(s => !isOnFrame(s, currentFrame)))}
              disabled={interactionDisabled}
              title={`Veeg de stift van dit frame schoon (${strokesOnFrame} ${strokesOnFrame === 1 ? 'lijn' : 'lijnen'})`}
              className={`${knopklein} text-neutral-400 hover:bg-neutral-800 hover:text-amber-300 relative`}
            >
              <Eraser className="w-4 h-4" />
              <span className="absolute -top-0.5 -right-0.5 text-[9px] leading-none bg-neutral-700 text-neutral-200 rounded-full px-1 py-0.5">{strokesOnFrame}</span>
            </button>
          )}
          <button type="button" onClick={deleteSelected} disabled={!selection || interactionDisabled} title="Verwijder selectie" className={`${knopklein} text-neutral-400 hover:bg-red-900/50 hover:text-red-300`}>
            <Trash2 className="w-4 h-4" />
          </button>
          <button type="button" onClick={clearAll} disabled={interactionDisabled} title="Alles wissen" className={`${knopklein} text-neutral-400 hover:bg-neutral-800 hover:text-white`}>
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 min-w-0 min-h-0 flex flex-col lg:flex-row">
          {/* Canvas, passend geschaald zodat het veld nooit vervormt. */}
          <div ref={stageRef} className="flex-1 min-h-0 min-w-0 flex items-center justify-center p-3">
            <div className="relative rounded-xl overflow-hidden shadow-2xl flex-shrink-0" style={{ width: stage.w, height: stage.h }}>
              <canvas ref={courtRef} width={canvasW} height={canvasH} className="absolute inset-0 w-full h-full" />
              <canvas
                ref={overlayRef}
                width={canvasW}
                height={canvasH}
                className="absolute inset-0 w-full h-full"
                style={{ cursor: interactionDisabled ? 'default' : tool === 'select' ? 'default' : tool === 'text' ? 'text' : tool === 'eraser' ? 'cell' : 'crosshair', touchAction: 'none' }}
                onPointerDown={e => { (e.target as Element).setPointerCapture?.(e.pointerId); handleStart(getPos(e)) }}
                onPointerMove={e => handleMove(getPos(e))}
                onPointerUp={handleEnd}
                onPointerCancel={handleEnd}
              />
              {recording && (
                <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-red-600/90 backdrop-blur-sm px-2.5 py-1 rounded-full">
                  <Circle className="w-2.5 h-2.5 fill-white text-white animate-pulse" />
                  <span className="text-xs text-white font-semibold uppercase tracking-wide">Rec</span>
                </div>
              )}
            </div>
          </div>

          {/* Afspelen en frames. */}
          <div className="bg-neutral-900 border-t lg:border-t-0 lg:border-l border-neutral-800 px-3 py-2 flex-shrink-0 flex items-center gap-3 flex-wrap lg:w-56 lg:flex-col lg:items-stretch lg:overflow-y-auto">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={togglePlay}
                disabled={recording}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors disabled:opacity-40 flex-shrink-0 ${playing ? 'bg-amber-500 text-white' : 'bg-green-600 text-white hover:bg-green-700'}`}
              >
                {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </button>
              <button type="button" onClick={stopPlay} disabled={recording} title="Stoppen" className={`${knopklein} text-neutral-400 hover:bg-neutral-800 hover:text-white`}>
                <StopIcon className="w-4 h-4" />
              </button>
              <select value={speed} onChange={e => setSpeed(Number(e.target.value))} disabled={interactionDisabled} title="Afspeelsnelheid" className="bg-neutral-800 border border-neutral-700 text-white rounded px-2 py-1 text-xs focus:outline-none focus:border-sparta">
                <option value={0.5}>0.5×</option>
                <option value={1}>1×</option>
                <option value={1.5}>1.5×</option>
                <option value={2}>2×</option>
              </select>
            </div>

            <div className="w-px h-6 bg-neutral-800 lg:w-full lg:h-px" />

            <div className="flex items-center gap-1 text-xs text-neutral-400 lg:justify-between">
              <span>Pauze hier:</span>
              <span className="flex items-center gap-1">
                <input
                  type="number" min={0} max={5000} step={100} value={currentHold}
                  onChange={e => {
                    const v = Math.max(0, Math.min(5000, Number(e.target.value) || 0))
                    setFrames(prev => prev.map((f, i) => i === currentFrame ? { ...f, hold_ms: v } : f))
                  }}
                  disabled={interactionDisabled}
                  className="bg-neutral-800 border border-neutral-700 text-white rounded px-2 py-1 text-xs focus:outline-none focus:border-sparta w-16"
                />
                ms
              </span>
            </div>

            <div className="flex items-center gap-1 text-xs text-neutral-400 lg:justify-between">
              <span>Slow-mo:</span>
              <select
                value={currentSlowIn}
                onChange={e => { const v = Number(e.target.value); setFrames(prev => prev.map((f, i) => i === currentFrame ? { ...f, slow_in: v } : f)) }}
                disabled={interactionDisabled || currentFrame === 0}
                title={currentFrame === 0 ? 'Slow-mo werkt op de instroom van een frame; het eerste frame heeft geen instroom.' : 'Vertraagt de overgang naar dit frame'}
                className="bg-neutral-800 border border-neutral-700 text-white rounded px-1.5 py-1 text-xs focus:outline-none focus:border-sparta disabled:opacity-40"
              >
                <option value={1}>1×</option>
                <option value={0.75}>0.75×</option>
                <option value={0.5}>0.5×</option>
                <option value={0.33}>0.33×</option>
                <option value={0.25}>0.25×</option>
              </select>
            </div>

            <div className="flex items-center gap-1 text-xs text-neutral-400 lg:flex-col lg:items-stretch">
              <span className="whitespace-nowrap">Stap:</span>
              <input
                type="text"
                value={currentText}
                onChange={e => { const v = e.target.value; setFrames(prev => prev.map((f, i) => i === currentFrame ? { ...f, text: v } : f)) }}
                disabled={interactionDisabled}
                placeholder="Wat gebeurt hier?"
                title="Een frame met tekst wordt een stap in de speler en staat als ondertitel in beeld, ook in de video."
                className="bg-neutral-800 border border-neutral-700 text-white rounded px-2 py-1 text-xs focus:outline-none focus:border-sparta w-40 lg:w-full"
              />
            </div>

            {selection?.kind === 'object' && (
              <button
                type="button"
                onClick={toggleHighlightForSelected}
                disabled={interactionDisabled}
                title={isSelectedHighlighted ? 'Pulse op dit frame uitzetten' : 'Pulse op dit frame zetten'}
                className={`flex items-center justify-center gap-1 px-2.5 h-7 rounded text-xs transition-colors disabled:opacity-30 ${isSelectedHighlighted ? 'bg-amber-500 text-white' : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'}`}
              >
                <Sparkles className="w-3.5 h-3.5" /> Pulse
              </button>
            )}

            <div className="w-px h-6 bg-neutral-800 lg:w-full lg:h-px" />
            <span className="hidden lg:block text-[10px] uppercase tracking-wider text-neutral-500">Frames</span>

            <div className="flex items-center gap-1 overflow-x-auto flex-1 lg:flex-none lg:flex-wrap lg:overflow-visible">
              <button type="button" onClick={() => setCurrentFrame(Math.max(0, currentFrame - 1))} disabled={currentFrame === 0 || interactionDisabled} title="Vorig frame"
                className="w-7 h-7 rounded flex items-center justify-center text-neutral-400 hover:bg-neutral-800 disabled:opacity-30 transition-colors flex-shrink-0">
                <ChevronLeft className="w-4 h-4" />
              </button>
              {frames.map((f, i) => (
                <button key={f.id} type="button" onClick={() => { setCurrentFrame(i); setSelection(null) }} disabled={interactionDisabled}
                  className={`min-w-[2rem] h-7 px-2 rounded-md text-xs font-semibold transition-colors flex-shrink-0 ${currentFrame === i ? 'bg-sparta text-white' : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'}`}>
                  {i + 1}{f.text?.trim() ? '💬' : ''}{(f.hold_ms ?? 0) > 0 ? '⏱' : ''}{(f.slow_in ?? 1) < 1 ? '🐢' : ''}{(f.highlights?.length ?? 0) > 0 ? '✨' : ''}
                </button>
              ))}
              <button type="button" onClick={addFrame} disabled={interactionDisabled} title="Frame toevoegen"
                className="w-7 h-7 rounded flex items-center justify-center text-neutral-400 hover:bg-green-900/40 hover:text-green-300 disabled:opacity-30 transition-colors flex-shrink-0">
                <Plus className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => setCurrentFrame(Math.min(frames.length - 1, currentFrame + 1))} disabled={currentFrame >= frames.length - 1 || interactionDisabled} title="Volgend frame"
                className="w-7 h-7 rounded flex items-center justify-center text-neutral-400 hover:bg-neutral-800 disabled:opacity-30 transition-colors flex-shrink-0">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button type="button" onClick={deleteFrame} disabled={frames.length === 1 || interactionDisabled} title="Frame verwijderen"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:bg-red-900/40 hover:text-red-300 disabled:opacity-30 transition-colors flex-shrink-0 lg:self-start">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
