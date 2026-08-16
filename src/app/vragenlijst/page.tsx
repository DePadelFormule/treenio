import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { VragenlijstFormulier } from "@/components/VragenlijstFormulier";
import { VRAGENLIJST_INTRO } from "@/lib/vragenlijst";

// Publieke pagina (geen inlog): spelers vullen de seizoensstart-vragenlijst in
// via een gedeelde link. De naam-kiezer toont alleen spelers die nog niet
// hebben ingevuld.
export const dynamic = "force-dynamic";

export default async function VragenlijstPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("vragenlijst_spelers" as never);
  const spelers = (data ?? []) as { id: string; naam: string; rugnummer: number | null }[];

  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <div className="mb-6 text-center">
        <Image
          src="/logo.png"
          alt="Treenio"
          width={800}
          height={635}
          priority
          className="mx-auto mb-2 h-auto w-36"
        />
        <h1 className="text-xl font-bold text-sparta">Vragenlijst seizoensstart</h1>
        <p className="text-sm font-semibold text-neutral-700">Nivo Sparta JO17-2</p>
      </div>

      <p className="mb-6 rounded-xl bg-neutral-100 p-4 text-sm text-neutral-600">{VRAGENLIJST_INTRO}</p>

      {error ? (
        <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-400">
          De vragenlijst is nog niet klaargezet. Meld het bij de trainer.
        </p>
      ) : spelers.length === 0 ? (
        <p className="rounded-xl bg-green-50 p-6 text-center text-sm text-green-700">
          Iedereen heeft de vragenlijst al ingevuld. Top! ⚽
        </p>
      ) : (
        <VragenlijstFormulier spelers={spelers} />
      )}
    </main>
  );
}
