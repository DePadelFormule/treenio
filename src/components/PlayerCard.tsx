import Image from "next/image";
import type { Badge, Speler, SpelerRecord } from "@/lib/types/database";

function leeftijd(geboortedatum: string | null): number | null {
  if (!geboortedatum) return null;
  const d = new Date(geboortedatum);
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
}

function initialen(naam: string): string {
  return naam
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

interface PlayerCardProps {
  speler: Speler;
  badges: Badge[];
  records: SpelerRecord[];
}

// FIFA-achtig kaartje als IDENTITEIT + MIJLPALEN — bewust GEEN totaal-OVR
// en geen vergelijkbare skill-score. Zie architectuurregel 3.
export function PlayerCard({ speler, badges, records }: PlayerCardProps) {
  const jaren = leeftijd(speler.geboortedatum);

  return (
    <div className="relative w-72 overflow-hidden rounded-3xl bg-gradient-to-b from-gold to-amber-300 p-1 shadow-2xl">
      <div className="rounded-[1.35rem] bg-gradient-to-b from-neutral-900 to-pitch-dark p-5 text-white">
        {/* Kop: rugnummer + positie i.p.v. een OVR-cijfer */}
        <div className="flex items-start justify-between">
          <div className="leading-none">
            <div className="text-4xl font-black text-gold">
              {speler.rugnummer ?? "–"}
            </div>
            <div className="mt-1 text-xs font-semibold uppercase tracking-wider text-white/70">
              {speler.positie_voorkeur ?? "Speler"}
            </div>
          </div>
          <div className="text-right text-xs text-white/60">
            {jaren ? `${jaren} jr` : ""}
          </div>
        </div>

        {/* Pasfoto */}
        <div className="mx-auto my-4 flex h-32 w-32 items-center justify-center overflow-hidden rounded-full bg-white/10 ring-2 ring-gold/60">
          {speler.foto_url ? (
            <Image
              src={speler.foto_url}
              alt={speler.naam}
              width={128}
              height={128}
              className="h-32 w-32 object-cover"
            />
          ) : (
            <span className="text-3xl font-bold text-white/80">
              {initialen(speler.naam)}
            </span>
          )}
        </div>

        {/* Naam */}
        <h2 className="text-center text-xl font-extrabold uppercase tracking-wide">
          {speler.naam}
        </h2>

        {/* Mijlpalen i.p.v. stat-blok: badges + records (zelf-referentieel) */}
        <div className="mt-4 space-y-3">
          <div>
            <div className="text-[0.65rem] font-semibold uppercase tracking-wider text-white/50">
              Badges
            </div>
            {badges.length ? (
              <div className="mt-1 flex flex-wrap gap-1.5">
                {badges.slice(0, 6).map((b) => (
                  <span
                    key={b.id}
                    className="rounded-full bg-gold/20 px-2 py-0.5 text-xs font-medium text-gold"
                  >
                    {b.type}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-xs text-white/40">Nog geen badges — go get ’em.</p>
            )}
          </div>

          <div>
            <div className="text-[0.65rem] font-semibold uppercase tracking-wider text-white/50">
              Persoonlijke records
            </div>
            {records.length ? (
              <ul className="mt-1 space-y-0.5">
                {records.slice(0, 4).map((r) => (
                  <li key={r.id} className="flex justify-between text-xs">
                    <span className="text-white/70">{r.soort}</span>
                    <span className="font-semibold text-white">{r.waarde}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-xs text-white/40">Nog geen records.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
