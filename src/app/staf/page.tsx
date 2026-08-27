import Link from "next/link";
import { redirect } from "next/navigation";
import { getHuidigeGebruiker } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/SignOutButton";
import type { AcademyHoofdstuk, AcademyQuizResultaat, PositieVoorkeur, Staf } from "@/lib/types/database";

interface AcademyRegel {
  hoofdstuk: string;
  hoofdstukId: string;
  spelerNaam: string;
  score: number;
  totaal: number;
}

// Quiz-resultaten per hoofdstuk: privé voor alle trainers (spelers zien dit
// nooit). Handmatige join, zelfde stijl als positieStatus hierboven.
async function academyResultaten(): Promise<AcademyRegel[]> {
  const supabase = await createClient();
  const [{ data: hoofdstukken }, { data: resultaten }, { data: spelers }] = await Promise.all([
    supabase.from("academy_hoofdstukken").select("id, titel"),
    supabase.from("academy_quiz_resultaten").select("*").order("created_at", { ascending: false }),
    supabase.from("spelers").select("id, naam"),
  ]);
  const hoofdstukTitel = new Map(
    ((hoofdstukken ?? []) as Pick<AcademyHoofdstuk, "id" | "titel">[]).map((h) => [h.id, h.titel]),
  );
  const spelerNaam = new Map(
    ((spelers ?? []) as { id: string; naam: string }[]).map((s) => [s.id, s.naam]),
  );
  return ((resultaten ?? []) as AcademyQuizResultaat[]).map((r) => ({
    hoofdstuk: hoofdstukTitel.get(r.hoofdstuk_id) ?? "?",
    hoofdstukId: r.hoofdstuk_id,
    spelerNaam: spelerNaam.get(r.speler_id) ?? "?",
    score: r.score,
    totaal: r.totaal,
  }));
}

interface TrainerStatus {
  naam: string;
  aantal: number; // aantal spelers waarvoor iets is ingevuld
  laatst: string | null; // ISO datum van laatste activiteit
}

// Per trainer samenvatten wie posities heeft ingevuld en wanneer. Alleen voor
// wie de conclusie mag zien (hoofdtrainer).
async function positieStatus(): Promise<TrainerStatus[]> {
  const supabase = await createClient();
  const [{ data: staf }, { data: voorkeuren }] = await Promise.all([
    supabase.from("staf").select("id, naam"),
    supabase.from("positie_voorkeuren").select("staf_id, speler_id, created_at"),
  ]);

  const spelersPer = new Map<string, Set<string>>();
  const laatstPer = new Map<string, string>();
  for (const v of (voorkeuren ?? []) as Pick<PositieVoorkeur, "staf_id" | "speler_id" | "created_at">[]) {
    if (!spelersPer.has(v.staf_id)) spelersPer.set(v.staf_id, new Set());
    spelersPer.get(v.staf_id)!.add(v.speler_id);
    const huidig = laatstPer.get(v.staf_id);
    if (!huidig || v.created_at > huidig) laatstPer.set(v.staf_id, v.created_at);
  }

  return ((staf ?? []) as Pick<Staf, "id" | "naam">[])
    .map((s) => ({
      naam: s.naam,
      aantal: spelersPer.get(s.id)?.size ?? 0,
      laatst: laatstPer.get(s.id) ?? null,
    }))
    .sort((a, b) => (b.laatst ?? "").localeCompare(a.laatst ?? ""));
}

// Staf-dashboard: startpunt met de menu-onderdelen.
export default async function StafPage() {
  const gebruiker = await getHuidigeGebruiker();
  if (!gebruiker) redirect("/login");
  if (gebruiker.rol !== "staf") redirect("/");

  // Volledige toegang = mag_conclusie. Assistenten zonder dat vlaggetje zien
  // alleen de positie-inventarisatie (en hun eigen account, in de header).
  const magAlles = gebruiker.staf?.mag_conclusie ?? false;
  const status = magAlles ? await positieStatus() : [];

  // Vragenlijst-status: wie van de selectie heeft al ingevuld?
  let vragenlijstStatus: { ingevuld: number; totaal: number; nogNiet: string[] } | null = null;
  if (magAlles) {
    const supabase = await createClient();
    const [{ data: alleSpelers }, { data: antwoorden }] = await Promise.all([
      supabase.from("spelers").select("*"),
      supabase.from("vragenlijst_antwoorden").select("speler_id"),
    ]);
    const klaarIds = new Set(
      ((antwoorden ?? []) as { speler_id: string }[]).map((a) => a.speler_id),
    );
    // Gastspelers doen niet mee met de vragenlijst.
    const spelers = ((alleSpelers ?? []) as { id: string; naam: string; gast?: boolean }[])
      .filter((s) => !s.gast);
    if (spelers.length > 0) {
      vragenlijstStatus = {
        ingevuld: spelers.filter((s) => klaarIds.has(s.id)).length,
        totaal: spelers.length,
        nogNiet: spelers.filter((s) => !klaarIds.has(s.id)).map((s) => s.naam.split(" ")[0]),
      };
    }
  }
  const grens = Date.now() - 3 * 24 * 60 * 60 * 1000; // "nieuw" = laatste 3 dagen
  const ingevuld = status.filter((s) => s.aantal > 0);
  const academyRegels = await academyResultaten();
  const academyPerHoofdstuk = new Map<string, AcademyRegel[]>();
  for (const r of academyRegels) {
    if (!academyPerHoofdstuk.has(r.hoofdstukId)) academyPerHoofdstuk.set(r.hoofdstukId, []);
    academyPerHoofdstuk.get(r.hoofdstukId)!.push(r);
  }

  // Alle trainers zien de app; alleen de AI-lesgenerator (kost geld per les),
  // het lessenarchief en de afgeronde positie-inventarisatie zijn exclusief
  // voor de hoofdtrainer.
  const basisMenu = [
    { href: "/staf/team", titel: "Team-overzicht", uitleg: "Alle spelers in één tabel: opkomst, minuten, goals, assists, kaarten." },
    { href: "/staf/spelers", titel: "Spelerskaarten", uitleg: "Per speler de volledige kaart met alle cijfers, doelen en notities." },
    { href: "/staf/wedstrijden", titel: "Wedstrijden", uitleg: "Programma beheren en per wedstrijd registreren (stats, keeper, scouting)." },
    { href: "/staf/trainingen", titel: "Trainingen", uitleg: "Presentielijst bijhouden: wie was er, afmeldingen en inzet." },
    { href: "/staf/spelsituaties", titel: "Spelsituaties", uitleg: "Tactisch tekenbord: magneetjes slepen, animatie maken en afspelen." },
    { href: "/staf/academy", titel: "Academy", uitleg: "Handboek voor spelers: begrippen, teamtaken en meer — met een leuke quiz." },
  ];
  const menu = magAlles
    ? [
        ...basisMenu,
        { href: "/staf/lesgenerator", titel: "Lesvoorbereiding", uitleg: "Papieren formulier printen en met een foto in het archief zetten, of de AI een training laten schrijven." },
        { href: "/staf/lessen", titel: "Lessenarchief", uitleg: "Bewaarde trainingen teruglezen, printen en hergebruiken." },
        { href: "/staf/posities", titel: "Positie-inventarisatie", uitleg: "Afgeronde inventarisatie: keuzes, uitkomst per speler en conclusie." },
      ]
    : basisMenu;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-sparta">Treenio</h1>
          <p className="text-sm text-neutral-500">
            Nivo Sparta JO17-2 · {gebruiker.staf?.naam}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/staf/account"
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100"
          >
            Mijn account
          </Link>
          <SignOutButton />
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {menu.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className="group rounded-xl border border-neutral-200 bg-white p-5 transition hover:border-sparta hover:shadow-sm"
          >
            <h2 className="text-lg font-semibold text-neutral-800 group-hover:text-sparta">
              {m.titel} <span className="text-sparta">→</span>
            </h2>
            <p className="mt-1 text-sm text-neutral-500">{m.uitleg}</p>
          </Link>
        ))}
      </div>

      {magAlles && ingevuld.length > 0 && (
        <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold text-neutral-800">Posities ingevuld</h2>
            <Link href="/staf/posities/overzicht" className="text-sm font-semibold text-sparta hover:underline">
              Bekijk keuzes →
            </Link>
          </div>
          <ul className="divide-y divide-neutral-100">
            {ingevuld.map((s) => {
              const nieuw = s.laatst != null && new Date(s.laatst).getTime() >= grens;
              return (
                <li key={s.naam} className="flex items-center justify-between py-1.5 text-sm">
                  <span className="flex items-center gap-2 text-neutral-700">
                    {s.naam}
                    {nieuw && (
                      <span className="rounded-full bg-sparta/10 px-2 py-0.5 text-xs font-semibold text-sparta">nieuw</span>
                    )}
                  </span>
                  <span className="text-neutral-400">
                    {s.aantal} {s.aantal === 1 ? "speler" : "spelers"}
                    {s.laatst && ` · ${new Date(s.laatst).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}`}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {vragenlijstStatus && (
        <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold text-neutral-800">Vragenlijst seizoensstart</h2>
            <Link href="/vragenlijst" className="text-sm font-semibold text-sparta hover:underline">
              Bekijk formulier →
            </Link>
          </div>
          <p className="text-sm text-neutral-700">
            <span className="font-semibold">{vragenlijstStatus.ingevuld} van {vragenlijstStatus.totaal}</span> spelers hebben ingevuld.
            {vragenlijstStatus.nogNiet.length > 0 && (
              <span className="text-neutral-400"> Nog niet: {vragenlijstStatus.nogNiet.join(", ")}.</span>
            )}
          </p>
          <p className="mt-2 text-xs text-neutral-400">
            Delen met de spelersgroep: stuur ze het app-adres met <span className="font-mono">/vragenlijst</span> erachter.
            De antwoorden verschijnen per speler op de spelerskaart.
          </p>
        </div>
      )}

      {academyPerHoofdstuk.size > 0 && (
        <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold text-neutral-800">Academy-quiz resultaten</h2>
            <Link href="/staf/academy" className="text-sm font-semibold text-sparta hover:underline">
              Beheer Academy →
            </Link>
          </div>
          <p className="mb-3 text-xs text-neutral-400">
            Alleen voor trainers. Ga hier discreet mee om — spelers zien elkaars score nooit.
          </p>
          <div className="space-y-4">
            {[...academyPerHoofdstuk.entries()].map(([hoofdstukId, regels]) => (
              <div key={hoofdstukId}>
                <p className="mb-1 text-sm font-semibold text-neutral-700">{regels[0].hoofdstuk}</p>
                <ul className="divide-y divide-neutral-100">
                  {regels.map((r, i) => (
                    <li key={i} className="flex items-center justify-between py-1 text-sm">
                      <span className="text-neutral-700">{r.spelerNaam}</span>
                      <span className="font-semibold text-neutral-600">{r.score} / {r.totaal}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
