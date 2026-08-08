import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getHuidigeGebruiker } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Lesblad } from "@/components/LesGenerator";
import type { OpgeslagenLes } from "@/lib/types/database";
import type { Les } from "@/lib/lesgenerator/schema";

export default async function LesDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const gebruiker = await getHuidigeGebruiker();
  if (!gebruiker) redirect("/login");
  if (gebruiker.rol !== "staf") redirect("/");

  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("lessen").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();

  const rij = data as OpgeslagenLes;
  const les = rij.les as Les;

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 print:py-2">
      <div className="mb-4 print:hidden">
        <Link href="/staf/lessen" className="text-sm text-neutral-500 hover:text-sparta hover:underline">
          ← Terug naar archief
        </Link>
      </div>
      {rij.datum && (
        <p className="mb-2 text-sm text-neutral-500 print:hidden">Training van {rij.datum}</p>
      )}
      <Lesblad les={les} />
    </main>
  );
}
