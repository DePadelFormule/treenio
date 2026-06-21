import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getHuidigeGebruiker } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TrainingPresentieRij } from "@/components/registratie/TrainingPresentieRij";
import type { Speler, Training, TrainingRegistratie } from "@/lib/types/database";

type RegBegin = {
  aanwezig: boolean;
  op_tijd: boolean | null;
  afmeld_status: string;
  inzet: number | null;
};

const LEEG: RegBegin = {
  aanwezig: false,
  op_tijd: null,
  afmeld_status: "nvt",
  inzet: null,
};

export default async function TrainingPresentiePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const gebruiker = await getHuidigeGebruiker();
  if (!gebruiker) redirect("/login");
  if (gebruiker.rol !== "staf") redirect("/");

  const { id } = await params;
  const supabase = await createClient();

  const { data: training } = await supabase
    .from("trainingen")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!training) notFound();
  const t = training as Training;

  const [{ data: spelers }, { data: regs }] = await Promise.all([
    supabase.from("spelers").select("*").order("rugnummer", { ascending: true, nullsFirst: false }),
    supabase.from("training_registraties").select("*").eq("training_id", id),
  ]);

  const regMap = new Map<string, TrainingRegistratie>();
  for (const r of (regs ?? []) as TrainingRegistratie[]) regMap.set(r.speler_id, r);

  function beginVoor(spelerId: string): RegBegin {
    const r = regMap.get(spelerId);
    if (!r) return LEEG;
    return {
      aanwezig: r.aanwezig,
      op_tijd: r.op_tijd,
      afmeld_status: r.afmeld_status,
      inzet: r.inzet,
    };
  }

  const lijst = (spelers ?? []) as Speler[];
  const aanwezig = lijst.filter((s) => regMap.get(s.id)?.aanwezig).length;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/staf/trainingen" className="text-sm text-neutral-500 hover:text-sparta hover:underline">
        ← Terug naar trainingen
      </Link>

      <header className="mt-4 mb-6">
        <h1 className="text-2xl font-bold text-sparta">Presentie training</h1>
        <p className="text-sm text-neutral-500">
          {t.datum}{t.type ? ` · ${t.type}` : ""} · {aanwezig}/{lijst.length} aanwezig
        </p>
      </header>

      <div className="space-y-2">
        {lijst.map((s) => (
          <TrainingPresentieRij
            key={s.id}
            trainingId={id}
            spelerId={s.id}
            naam={s.naam}
            rugnummer={s.rugnummer}
            begin={beginVoor(s.id)}
          />
        ))}
      </div>

      {lijst.length === 0 && (
        <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-400">
          Nog geen spelers in de selectie.
        </p>
      )}
    </main>
  );
}
