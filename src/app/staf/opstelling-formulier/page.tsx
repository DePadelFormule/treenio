import Link from "next/link";
import { redirect } from "next/navigation";
import { getHuidigeGebruiker } from "@/lib/auth";
import { FORMATIES } from "@/lib/formaties";
import { PrintKnop } from "@/components/PrintKnop";

// Leeg opstellingsformulier (A4, 4-3-3): veldje met schrijfvakken per positie,
// wissels en drie teamtaken. Zonder datum/tegenstander voorgedrukt, zodat je
// er in één keer een stapel kunt printen voor alle wedstrijden (kies het
// aantal kopieën in de printdialoog). Ingevuld? Foto maken op de
// opstelling-pagina van de wedstrijd → de AI zet alles in de app.

export default async function OpstellingFormulierPage() {
  const gebruiker = await getHuidigeGebruiker();
  if (!gebruiker) redirect("/login");
  if (gebruiker.rol !== "staf") redirect("/");

  const slots = FORMATIES["4-3-3"];

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 print:max-w-none print:px-0 print:py-0">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href="/staf/wedstrijden" className="text-sm text-neutral-500 hover:text-sparta hover:underline">
          ← Terug naar wedstrijden
        </Link>
        <PrintKnop />
      </div>
      <p className="mb-4 text-xs text-neutral-400 print:hidden">
        Tip: kies in de printdialoog het aantal kopieën (bijv. 10) — dan heb je meteen een stapel
        voor alle wedstrijden. Ingevuld formulier? Maak er een foto van op de opstelling-pagina
        van die wedstrijd; de AI zet de namen en taken dan in de app.
      </p>

      {/* Kop met invulruimte */}
      <header className="mb-3 border-b-2 border-sparta pb-2">
        <h1 className="text-lg font-bold text-sparta">Opstelling · Nivo Sparta JO17-2</h1>
        <p className="mt-1 flex gap-6 text-[13px] text-neutral-700">
          <span>Datum: ____________</span>
          <span>Tegenstander: ______________________</span>
        </p>
      </header>

      {/* Het veld (4-3-3) met schrijfvakken */}
      <div
        className="relative mx-auto w-full max-w-md rounded-xl border-2 border-neutral-400"
        style={{ aspectRatio: "1 / 1.05" }}
      >
        {/* veldlijnen, licht zodat pen leesbaar blijft */}
        <div className="pointer-events-none absolute inset-2 rounded-lg border border-neutral-300" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-neutral-300" />
        <div className="pointer-events-none absolute left-2 right-2 top-1/2 border-t border-neutral-300" />

        {slots.map((slot) => (
          <div
            key={slot.key}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
          >
            <div className="flex w-24 flex-col items-center">
              <span className="text-[10px] font-bold text-neutral-500">{slot.label}</span>
              <div className="h-7 w-24 rounded border border-neutral-400 bg-white" />
            </div>
          </div>
        ))}
      </div>

      {/* Wissels */}
      <section className="mt-4 break-inside-avoid">
        <h2 className="mb-1 rounded bg-neutral-100 px-2 py-1 text-sm font-bold text-neutral-800 print:bg-neutral-100">
          Wissels
        </h2>
        <div className="grid grid-cols-2 gap-x-8">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="flex items-end gap-2">
              <span className="text-[11px] font-bold text-neutral-400">{n}.</span>
              <div className="h-6 flex-1 border-b border-neutral-300" />
            </div>
          ))}
        </div>
      </section>

      {/* Teamtaken */}
      <section className="mt-4 break-inside-avoid">
        <h2 className="mb-1 rounded bg-neutral-100 px-2 py-1 text-sm font-bold text-neutral-800 print:bg-neutral-100">
          Teamtaken
        </h2>
        {[1, 2, 3].map((n) => (
          <div key={n} className="flex items-end gap-2">
            <span className="text-[11px] font-bold text-neutral-400">{n}.</span>
            <div className="h-7 flex-1 border-b border-neutral-300" />
          </div>
        ))}
      </section>

      <p className="mt-4 text-[10px] text-neutral-400">
        Treenio · Nivo Sparta JO17-2 · schrijf de namen duidelijk in de vakken — na de wedstrijd
        foto maken op de opstelling-pagina en de app neemt alles over.
      </p>
    </main>
  );
}
