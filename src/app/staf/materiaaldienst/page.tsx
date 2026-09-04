import Link from "next/link";
import { redirect } from "next/navigation";
import { getHuidigeGebruiker } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { genereerMateriaaldienst } from "./actions";
import { MateriaaldienstLijst, type MateriaaldienstRij, type SpelerOptie } from "@/components/MateriaaldienstLijst";
import type { MateriaaldienstSessie, Training, Wedstrijd, Speler } from "@/lib/types/database";

const DAGEN = ["zo", "ma", "di", "wo", "do", "vr", "za"];
const MAANDEN = [
  "januari", "februari", "maart", "april", "mei", "juni",
  "juli", "augustus", "september", "oktober", "november", "december",
];

function label(datum: string) {
  const d = new Date(`${datum}T12:00:00`);
  return `${DAGEN[d.getDay()]} ${d.getDate()} ${MAANDEN[d.getMonth()]}`;
}

export default async function MateriaaldienstPage() {
  const gebruiker = await getHuidigeGebruiker();
  if (!gebruiker) redirect("/login");
  if (gebruiker.rol !== "staf") redirect("/");

  await genereerMateriaaldienst();

  const supabase = await createClient();
  const [{ data: sessies }, { data: trainingen }, { data: wedstrijden }, { data: spelers }] =
    await Promise.all([
      supabase.from("materiaaldienst_sessies").select("*").order("volgorde", { ascending: true }),
      supabase.from("trainingen").select("id, datum"),
      supabase.from("wedstrijden").select("id, datum, tegenstander"),
      supabase.from("spelers").select("id, naam, gast").order("naam", { ascending: true }),
    ]);

  const trainingMap = new Map(((trainingen ?? []) as Pick<Training, "id" | "datum">[]).map((t) => [t.id, t]));
  const wedstrijdMap = new Map(
    ((wedstrijden ?? []) as Pick<Wedstrijd, "id" | "datum" | "tegenstander">[]).map((w) => [w.id, w]),
  );
  const alleSpelers = ((spelers ?? []) as (Pick<Speler, "id" | "naam"> & { gast?: boolean | null })[]).filter((s) => !s.gast);
  const spelerOpties: SpelerOptie[] = alleSpelers.map((s) => ({ id: s.id, naam: s.naam }));

  const vandaag = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });

  const rows: MateriaaldienstRij[] = ((sessies ?? []) as MateriaaldienstSessie[])
    .map((s) => {
      const training = s.training_id ? trainingMap.get(s.training_id) : null;
      const wedstrijd = s.wedstrijd_id ? wedstrijdMap.get(s.wedstrijd_id) : null;
      const datum = training?.datum ?? wedstrijd?.datum;
      if (!datum) return null;
      return {
        id: s.id,
        datum,
        label: label(datum),
        soort: training ? "Training" : `Wedstrijd · ${wedstrijd?.tegenstander ?? "?"}`,
        vandaag: datum === vandaag,
        verleden: datum < vandaag,
        speler1Id: s.speler_1_id,
        speler2Id: s.speler_2_id,
        speler1Halen: s.speler_1_halen,
        speler1Opruimen: s.speler_1_opruimen,
        speler2Halen: s.speler_2_halen,
        speler2Opruimen: s.speler_2_opruimen,
      };
    })
    .filter((r): r is MateriaaldienstRij & { datum: string } => r !== null)
    .sort((a, b) => a.datum.localeCompare(b.datum));

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/staf" className="text-sm text-neutral-500 hover:text-sparta hover:underline">
        ← Terug naar dashboard
      </Link>

      <h1 className="mt-4 mb-2 text-2xl font-bold text-sparta">Materiaaldienst</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Per training en wedstrijd een duo dat de materialen verzorgt: los aanvinken wie ze heeft
        gehaald en wie ze heeft opgeruimd — dat kan per speler apart, bijvoorbeeld als iemand
        eerder wegging. Met het keuzemenu kies je een andere speler als ze onderling ruilen.
      </p>

      {rows.length > 0 ? (
        <MateriaaldienstLijst rows={rows} spelers={spelerOpties} />
      ) : (
        <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-400">
          Nog geen trainingen of wedstrijden om een dienst voor in te delen.
        </p>
      )}
    </main>
  );
}
