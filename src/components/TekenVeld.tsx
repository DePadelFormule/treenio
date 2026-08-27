"use client";

import { useEffect, useRef, useState } from "react";

// Half speelveld om met de vinger/muis een oefening op te tekenen. Geeft de
// tekening als data-URL (PNG) door via onChange; leeg canvas → undefined.
// Zelfde veldlijnen als het printbare formulier (src/app/staf/lesgenerator/formulier).

const BREEDTE = 400;
const HOOGTE = 280;

function tekenVeldlijnen(ctx: CanvasRenderingContext2D) {
  ctx.clearRect(0, 0, BREEDTE, HOOGTE);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, BREEDTE, HOOGTE);
  ctx.strokeStyle = "#b3b3b3";
  ctx.lineWidth = 1;

  const schaalX = BREEDTE / 100;
  const schaalY = HOOGTE / 70;
  const rect = (x: number, y: number, w: number, h: number) =>
    ctx.strokeRect(x * schaalX, y * schaalY, w * schaalX, h * schaalY);

  // doel
  rect(44, 0.5, 12, 2.5);
  // veldrand
  rect(2, 3, 96, 64);
  // zestien + doelgebied
  rect(28, 3, 44, 17);
  rect(40, 3, 20, 7);
  // strafschopstip
  ctx.beginPath();
  ctx.arc(50 * schaalX, 15 * schaalY, 2, 0, Math.PI * 2);
  ctx.fillStyle = "#b3b3b3";
  ctx.fill();
  // boog bij de zestien
  ctx.beginPath();
  ctx.arc(50 * schaalX, 20 * schaalY, 9 * schaalX, Math.PI, 0);
  ctx.stroke();
  // halve middencirkel op de middellijn
  ctx.beginPath();
  ctx.arc(50 * schaalX, 67 * schaalY, 9 * schaalX, Math.PI, Math.PI * 2);
  ctx.stroke();
}

export function TekenVeld({
  waarde,
  onChange,
}: {
  waarde?: string;
  onChange: (dataUrl: string | undefined) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tekenend = useRef(false);
  const laatstePunt = useRef<{ x: number; y: number } | null>(null);
  const [heeftInkt, setHeeftInkt] = useState(false);

  // Achtergrond (veldlijnen) tekenen; bestaande tekening (bewerken) erover zetten.
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    tekenVeldlijnen(ctx);
    if (waarde) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, BREEDTE, HOOGTE);
      img.src = waarde;
      setHeeftInkt(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function positie(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * BREEDTE,
      y: ((e.clientY - rect.top) / rect.height) * HOOGTE,
    };
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    tekenend.current = true;
    laatstePunt.current = positie(e);
  }

  function teken(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!tekenend.current) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !laatstePunt.current) return;
    const punt = positie(e);
    ctx.strokeStyle = "#1a2e1a";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(laatstePunt.current.x, laatstePunt.current.y);
    ctx.lineTo(punt.x, punt.y);
    ctx.stroke();
    laatstePunt.current = punt;
    setHeeftInkt(true);
  }

  function stop() {
    if (!tekenend.current) return;
    tekenend.current = false;
    laatstePunt.current = null;
    onChange(canvasRef.current?.toDataURL("image/png"));
  }

  function wis() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    tekenVeldlijnen(ctx);
    setHeeftInkt(false);
    onChange(undefined);
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={BREEDTE}
        height={HOOGTE}
        onPointerDown={start}
        onPointerMove={teken}
        onPointerUp={stop}
        onPointerLeave={stop}
        className="w-full touch-none rounded-lg border border-neutral-300"
      />
      {heeftInkt && (
        <button
          type="button"
          onClick={wis}
          className="mt-1 text-xs font-semibold text-neutral-400 hover:text-red-600"
        >
          Tekening wissen
        </button>
      )}
    </div>
  );
}
