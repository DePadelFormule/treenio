// Tekent het tactiekbord (veld + magneetjes) op een canvas — gebruikt voor de
// video-export (canvas.captureStream + MediaRecorder). Zelfde indeling als de
// SVG op het scherm: liggend half veld met doel rechts, of een heel veld.

import type { BordFrame, BordTeam, BordToken } from "@/lib/types/database";

const SPARTA = "#C8102E";
const ZWART = "#111111";

function pitchAchtergrond(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, "#15803d");
  grad.addColorStop(1, "#14532d");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "rgba(255,255,255,0.3)";
  ctx.lineWidth = Math.max(1, w * 0.006);
}

function lijn(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function tekenHalfVeldLijnen(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // viewBox-equivalent 100x70, geschaald naar w/h.
  const sx = w / 100;
  const sy = h / 70;
  ctx.strokeRect(97.3 * sx, 29 * sy, 2.7 * sx, 12 * sy); // doel
  ctx.strokeRect(81 * sx, 13 * sy, 17 * sx, 44 * sy); // 16-meter
  ctx.strokeRect(91 * sx, 25 * sy, 7 * sx, 20 * sy); // 5-meter
  ctx.beginPath();
  ctx.arc(83 * sx, 35 * sy, 0.8 * Math.min(sx, sy), 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.fill();
  // boog bij de 16
  ctx.beginPath();
  ctx.arc(83 * sx, 35 * sy, 9 * sx, Math.PI * 0.5, Math.PI * 1.5, true);
  ctx.stroke();
  // halve middencirkel
  ctx.beginPath();
  ctx.arc(2 * sx, 35 * sy, 9 * sx, -Math.PI * 0.5, Math.PI * 0.5, false);
  ctx.stroke();
  // buitenrand
  ctx.strokeRect(2 * sx, 3 * sy, 96 * sx, 64 * sy);
}

function tekenHeelVeldLijnen(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const inset = w * 0.03;
  ctx.strokeRect(inset, inset, w - inset * 2, h - inset * 2);
  lijn(ctx, inset, h / 2, w - inset, h / 2);
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, h * 0.13, 0, Math.PI * 2);
  ctx.stroke();
  const boxW = w * 0.5;
  const boxH = h * 0.17;
  ctx.strokeRect((w - boxW) / 2, inset, boxW, boxH);
  ctx.strokeRect((w - boxW) / 2, h - inset - boxH, boxW, boxH);
}

const TOKEN_KLEUR: Record<BordTeam, { vlak: string; tekst: string }> = {
  eigen: { vlak: SPARTA, tekst: "#ffffff" },
  tegenstander: { vlak: ZWART, tekst: "#ffffff" },
  bal: { vlak: "#ffffff", tekst: "#171717" },
};

export function tekenBordFrame(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  halfVeld: boolean,
  tokens: BordToken[],
  frame: BordFrame,
) {
  ctx.clearRect(0, 0, w, h);
  pitchAchtergrond(ctx, w, h);
  if (halfVeld) tekenHalfVeldLijnen(ctx, w, h);
  else tekenHeelVeldLijnen(ctx, w, h);

  const r = Math.max(10, w * 0.032);
  for (const tok of tokens) {
    const pos = frame[tok.id] ?? { x: 50, y: 50 };
    const x = (pos.x / 100) * w;
    const y = (pos.y / 100) * h;
    const kleur = TOKEN_KLEUR[tok.team];
    const straal = tok.team === "bal" ? r * 0.55 : r;
    ctx.beginPath();
    ctx.arc(x, y, straal, 0, Math.PI * 2);
    ctx.fillStyle = kleur.vlak;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.stroke();
    if (tok.team !== "bal") {
      ctx.fillStyle = kleur.tekst;
      ctx.font = `bold ${Math.round(straal)}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(tok.label, x, y + 1);
    } else {
      ctx.font = `${Math.round(straal * 1.3)}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("⚽", x, y + 1);
    }
  }
}
