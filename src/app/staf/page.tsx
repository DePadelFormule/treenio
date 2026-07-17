import Link from "next/link";
import { redirect } from "next/navigation";
import { getHuidigeGebruiker } from "@/lib/auth";
import { SignOutButton } from "@/components/SignOutButton";

// Staf-dashboard: startpunt met de menu-onderdelen.
export default async function StafPage() {
  const gebruiker = await getHuidigeGebruiker();
  if (!gebruiker) redirect("/login");
  if (gebruiker.rol !== "staf") redirect("/");

  // Volledige toegang = mag_conclusie. Assistenten zonder dat vlaggetje zien
  // alleen de positie-inventarisatie (en hun eigen account, in de header).
  const magAlles = gebruiker.staf?.mag_conclusie ?? false;

  const volledigMenu = [
    { href: "/staf/team", titel: "Team-overzicht", uitleg: "Alle spelers in één tabel: opkomst, minuten, goals, assists, kaarten." },
    { href: "/staf/spelers", titel: "Spelerskaarten", uitleg: "Per speler de volledige kaart met alle cijfers, doelen en notities." },
    { href: "/staf/wedstrijden", titel: "Wedstrijden", uitleg: "Programma beheren en per wedstrijd registreren (stats, keeper, scouting)." },
    { href: "/staf/trainingen", titel: "Trainingen", uitleg: "Presentielijst bijhouden: wie was er, afmeldingen en inzet." },
    { href: "/staf/spelsituaties", titel: "Spelsituaties", uitleg: "Tactisch tekenbord: magneetjes slepen, animatie maken en afspelen." },
    { href: "/staf/lesgenerator", titel: "AI-lesgenerator", uitleg: "Laat de AI een complete training schrijven op basis van thema, duur en niveau." },
    { href: "/staf/posities", titel: "Positie-inventarisatie", uitleg: "Vul per speler je 1e/2e/3e positie in voor 4-3-3 en 4-4-2." },
  ];
  const beperktMenu = [
    { href: "/staf/posities", titel: "Positie-inventarisatie", uitleg: "Vul per speler je 1e/2e/3e positie in voor 4-3-3 en 4-4-2." },
  ];
  const menu = magAlles ? volledigMenu : beperktMenu;

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
    </main>
  );
}
