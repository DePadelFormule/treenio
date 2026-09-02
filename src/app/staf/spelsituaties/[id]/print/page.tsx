import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getHuidigeGebruiker } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PrintKnop } from "@/components/PrintKnop";
import { PlayPreview } from "@/components/tactiek/PlayViewer";
import { naarPlayData } from "@/lib/tactiek/vanBordData";
import type { Spelsituatie } from "@/lib/types/database";

// Printbare PDF-storyboard: elke stap als apart veldje met de spelers erop.
// Via de printdialoog ("Bewaar als PDF") te downloaden.

export default async function SpelsituatiePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const gebruiker = await getHuidigeGebruiker();
  if (!gebruiker) redirect("/login");
  if (gebruiker.rol !== "staf") redirect("/");

  const { id } = await params;
  const supabase = await createClient();
  const { data: situatie } = await supabase.from("spelsituaties").select("*").eq("id", id).maybeSingle();
  if (!situatie) notFound();
  const s = situatie as Spelsituatie;
  const play = naarPlayData(s.data, s.half_veld, s.titel, s.uitleg ?? "");
  const veld = s.half_veld ? "half" : "heel";

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
          Nivo Sparta JO17-2 · {play.frames.length} stap{play.frames.length === 1 ? "" : "pen"}
        </p>
      </header>

      <div className="grid grid-cols-2 gap-4">
        {play.frames.map((frame, i) => (
          <div key={frame.id} className="print:break-inside-avoid">
            <p className="mb-1 text-center text-xs font-bold text-neutral-600">
              Stap {i + 1}{frame.text?.trim() ? `: ${frame.text.trim()}` : ""}
            </p>
            <PlayPreview play={play} veld={veld} frameIndex={i} />
          </div>
        ))}
      </div>

      <p className="mt-4 text-[10px] text-neutral-400">Treenio · uitgeprint vanuit Spelsituaties</p>
    </main>
  );
}
