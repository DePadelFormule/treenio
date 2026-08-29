import Link from "next/link";
import { redirect } from "next/navigation";
import { getHuidigeGebruiker } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { VerversKnop } from "@/components/VerversKnop";
import type { Speler, VragenlijstAntwoorden } from "@/lib/types/database";

// Nooit statisch cachen: spelers vullen de vragenlijst nog steeds in terwijl
// een trainer dit overzicht open heeft staan.
export const dynamic = "force-dynamic";

// Samenvatting van de seizoensstart-vragenlijst: keepen, aanvoerder-stemmen,
// en welke ouders kunnen rijden/willen vlaggen. Voor alle staf.

function normaliseer(tekst: string): string {
  return tekst.trim().toLowerCase();
}

// Vrije tekst "wie moet aanvoerder worden" koppelen aan een bestaande
// spelernaam (op voornaam of volledige naam), anders de ruwe tekst tonen.
function matchSpeler(antwoord: string, spelers: Speler[]): string {
  const a = normaliseer(antwoord);
  const exact = spelers.find((s) => normaliseer(s.naam) === a);
  if (exact) return exact.naam;
  const opVoornaam = spelers.find((s) => normaliseer(s.naam).split(" ")[0] === a.split(" ")[0]);
  if (opVoornaam) return opVoornaam.naam;
  return antwoord.trim();
}

// Open vraag: leeslijst van speler + antwoord, alfabetisch op naam.
function Leeslijst({
  titel, antwoorden, vraagId, naamVan,
}: {
  titel: string;
  antwoorden: VragenlijstAntwoorden[];
  vraagId: string;
  naamVan: (rij: VragenlijstAntwoorden) => string;
}) {
  const rijen = antwoorden
    .filter((a) => a.antwoorden[vraagId]?.trim())
    .map((a) => ({ naam: naamVan(a), tekst: a.antwoorden[vraagId] }))
    .sort((a, b) => a.naam.localeCompare(b.naam));

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <h2 className="mb-3 font-semibold text-neutral-800">{titel}</h2>
      {rijen.length === 0 ? (
        <p className="text-sm text-neutral-400">Nog geen antwoorden.</p>
      ) : (
        <dl className="divide-y divide-neutral-100">
          {rijen.map((r) => (
            <div key={r.naam} className="py-2">
              <dt className="text-xs font-semibold text-sparta">{r.naam}</dt>
              <dd className="whitespace-pre-wrap text-sm text-neutral-800">{r.tekst}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

function Groep({ titel, groepen }: { titel: string; groepen: { label: string; namen: string[] }[] }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <h2 className="mb-3 font-semibold text-neutral-800">{titel}</h2>
      <div className="space-y-3">
        {groepen.map((g) => (
          <div key={g.label}>
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
              {g.label} <span className="text-neutral-300">({g.namen.length})</span>
            </p>
            <p className="text-sm text-neutral-800">
              {g.namen.length > 0 ? g.namen.join(", ") : <span className="text-neutral-400">niemand</span>}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function VragenlijstOverzichtPage() {
  const gebruiker = await getHuidigeGebruiker();
  if (!gebruiker) redirect("/login");
  if (gebruiker.rol !== "staf") redirect("/");

  const supabase = await createClient();
  const [{ data: spelersData }, { data: antwoordenData }] = await Promise.all([
    supabase.from("spelers").select("*"),
    supabase.from("vragenlijst_antwoorden").select("*"),
  ]);
  const spelers = ((spelersData ?? []) as Speler[]).filter((s) => !s.gast);
  const spelerNaam = new Map(spelers.map((s) => [s.id, s.naam]));
  const antwoorden = (antwoordenData ?? []) as VragenlijstAntwoorden[];

  const naamVan = (rij: VragenlijstAntwoorden) => spelerNaam.get(rij.speler_id) ?? "?";

  // 1. Keepen
  const keepenGroepen = ["Ik wil keepen", "Een halve wedstrijd per keer", "Liever niet"].map((optie) => ({
    label: optie,
    namen: antwoorden.filter((a) => a.antwoorden.keepen === optie).map(naamVan),
  }));

  // 2. Aanvoerder — stemmen tellen op genormaliseerde naam.
  const stemmen = new Map<string, string[]>(); // gekozen naam -> stemmers
  for (const a of antwoorden) {
    const ruw = a.antwoorden.aanvoerder;
    if (!ruw?.trim()) continue;
    const gekozen = matchSpeler(ruw, spelers);
    if (!stemmen.has(gekozen)) stemmen.set(gekozen, []);
    stemmen.get(gekozen)!.push(naamVan(a));
  }
  const aanvoerderStemmen = [...stemmen.entries()]
    .map(([naam, stemmers]) => ({ naam, stemmers }))
    .sort((a, b) => b.stemmers.length - a.stemmers.length);

  // 3. Rijden (ouders)
  const rijdenGroepen = ["Ja", "Soms", "Nee"].map((optie) => ({
    label: optie,
    namen: antwoorden.filter((a) => a.antwoorden.rijden === optie).map(naamVan),
  }));

  // 4. Vlaggen (ouders)
  const vlaggenGroepen = ["Ja", "Misschien", "Nee"].map((optie) => ({
    label: optie,
    namen: antwoorden.filter((a) => a.antwoorden.vlaggen_ouders === optie).map(naamVan),
  }));

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center justify-between">
        <Link href="/staf" className="text-sm text-neutral-500 hover:text-sparta hover:underline">
          ← Terug naar dashboard
        </Link>
        <VerversKnop />
      </div>

      <h1 className="mt-4 mb-1 text-2xl font-bold text-sparta">Vragenlijst · overzicht</h1>
      <p className="mb-5 text-sm text-neutral-500">
        {antwoorden.length} van de {spelers.length} spelers hebben ingevuld.
        {" "}Volledige losse antwoorden staan per speler op de spelerskaart.
      </p>

      {antwoorden.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-400">
          Nog niemand heeft de vragenlijst ingevuld.
        </p>
      ) : (
        <div className="space-y-4">
          <Groep titel="🧤 Keepen" groepen={keepenGroepen} />

          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <h2 className="mb-3 font-semibold text-neutral-800">🎖️ Aanvoerder — stemmen</h2>
            {aanvoerderStemmen.length === 0 ? (
              <p className="text-sm text-neutral-400">Nog geen stemmen.</p>
            ) : (
              <ul className="space-y-2">
                {aanvoerderStemmen.map((s) => (
                  <li key={s.naam} className="flex items-start justify-between gap-3 border-b border-neutral-100 py-1.5 text-sm last:border-0">
                    <span className="font-medium text-neutral-800">{s.naam}</span>
                    <span className="text-right text-neutral-500">
                      <span className="font-bold text-sparta">{s.stemmers.length}</span> stem{s.stemmers.length === 1 ? "" : "men"}
                      <br />
                      <span className="text-xs text-neutral-400">{s.stemmers.join(", ")}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Groep titel="🚗 Rijden bij uitwedstrijden (ouders)" groepen={rijdenGroepen} />
          <Groep titel="🚩 Vlaggen (ouders)" groepen={vlaggenGroepen} />

          <Leeslijst
            titel="🎯 Verwacht van de trainers — tijdens trainingen"
            antwoorden={antwoorden} vraagId="verwacht_trainingen" naamVan={naamVan}
          />
          <Leeslijst
            titel="🎯 Verwacht van de trainers — tijdens wedstrijden"
            antwoorden={antwoorden} vraagId="verwacht_wedstrijden" naamVan={naamVan}
          />
          <Leeslijst
            titel="📈 Waar willen ze meer tijd/aandacht aan besteden tijdens trainingen"
            antwoorden={antwoorden} vraagId="meer_aandacht" naamVan={naamVan}
          />
          <Leeslijst
            titel="🔧 Verbeterpunten (wat willen ze verbeteren dit seizoen)"
            antwoorden={antwoorden} vraagId="verbeterpunten" naamVan={naamVan}
          />
        </div>
      )}
    </main>
  );
}
