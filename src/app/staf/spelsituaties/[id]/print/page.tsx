import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getHuidigeGebruiker } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PrintKnop } from "@/components/PrintKnop";
import { HalfVeldLijnen } from "@/components/HalfVeldLijnen";
import type { BordFrame, BordToken, Spelsituatie } from "@/lib/types/database";

// Printbare PDF-storyboard: elke stap als apart veldje met de spelers erop.
// Via de printdialoog ("Bewaar als PDF") te downloaden.

const KLEUR: Record<string, string> = {
  eigen: "bg-sparta text-white",
  tegenstander: "bg-neutral-900 text-white",
  bal: "bg-white text-neutral-900 border border-neutral-300",
};

function Veldje({ halfVeld, tokens, frame }: { halfVeld: boolean; tokens: BordToken[]; frame: BordFrame }) {
  return (
    <div
      className="relative w-full overflow-hidden rounded-xl border-2 border-neutral-700 bg-gradient-to-b from-green-700 to-green-800 print:break-inside-avoid"
      style={{ aspectRatio: halfVeld ? "3 / 2" : "2 / 3" }}
    >
      {halfVeld ? (
        <HalfVeldLijnen />
      ) : (
        <>
          <div className="pointer-events-none absolute inset-3 rounded-lg border-2 border-white/30" />
          <div className="pointer-events-none absolute left-3 right-3 top-1/2 -translate-y-1/2 border-t-2 border-white/30" />
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/30" />
          <div className="pointer-events-none absolute left-1/4 right-1/4 top-3 h-12 border-2 border-white/30" />
          <div className="pointer-events-none absolute bottom-3 left-1/4 right-1/4 h-12 border-2 border-white/30" />
        </>
      )}
      {tokens.map((tok) => {
        const pos = frame[tok.id] ?? { x: 50, y: 50 };
        return (
          <div
            key={tok.id}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
          >
            <div className={`flex items-center justify-center rounded-full font-bold shadow ${KLEUR[tok.team]} ${tok.team === "bal" ? "h-4 w-4 text-[9px]" : "h-6 w-6 text-xs"}`}>
              {tok.team === "bal" ? "⚽" : tok.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default async function SpelsituatiePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const gebruiker = await getHuidigeGebruiker();
  if (!gebruiker) redirect("/login");
  if (gebruiker.rol !== "staf") redirect("/");

  const { id } = await params;
  const supabase = await createClient();
  const { data: situatie } = await supabase.from("spelsituaties").select("*").eq("id", id).maybeSingle();
  if (!situatie) notFound();
  const s = situatie as Spelsituatie;
  const tokens = s.data?.tokens ?? [];
  const frames = s.data?.frames && s.data.frames.length ? s.data.frames : [{}];

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 print:max-w-none print:px-0 print:py-0">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href={`/staf/spelsituaties/${id}`} className="text-sm text-neutral-500 hover:text-sparta hover:underline">
          ← Terug naar de situatie
        </Link>
        <PrintKnop />
      </div>

      <header className="mb-4 border-b-2 border-sparta pb-2">
        <h1 className="text-lg font-bold text-sparta">{s.titel || "Spelsituatie"}</h1>
        {s.uitleg && <p className="mt-1 text-sm text-neutral-700">{s.uitleg}</p>}
        <p className="mt-1 text-[11px] text-neutral-400">
          Nivo Sparta JO17-2 · {frames.length} stap{frames.length === 1 ? "" : "pen"}
        </p>
      </header>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {frames.map((frame, i) => (
          <div key={i} className="print:break-inside-avoid">
            <p className="mb-1 text-center text-xs font-bold text-neutral-600">Stap {i + 1}</p>
            <Veldje halfVeld={s.half_veld} tokens={tokens} frame={frame} />
          </div>
        ))}
      </div>

      <p className="mt-4 text-[10px] text-neutral-400">Treenio · uitgeprint vanuit Spelsituaties</p>
    </main>
  );
}
