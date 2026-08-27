// Liggend half speelveld (doel rechts, middellijn links): 5-meter, 16-meter
// met boog, en de halve middencirkel bij de middellijn. Vult de container
// (aspect-ratio wordt door de ouder bepaald); alleen de lijnen, geen bal.
export function HalfVeldLijnen({ kleur = "white", dekking = 0.3 }: { kleur?: string; dekking?: number }) {
  const stroke = kleur;
  return (
    <svg
      viewBox="0 0 100 70"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 h-full w-full"
    >
      {/* doel */}
      <rect x="97.3" y="29" width="2.7" height="12" fill="none" stroke={stroke} strokeOpacity={dekking} strokeWidth="0.8" />
      {/* 16-meter */}
      <rect x="81" y="13" width="17" height="44" fill="none" stroke={stroke} strokeOpacity={dekking} strokeWidth="0.8" />
      {/* 5-meter */}
      <rect x="91" y="25" width="7" height="20" fill="none" stroke={stroke} strokeOpacity={dekking} strokeWidth="0.8" />
      {/* strafschopstip */}
      <circle cx="83" cy="35" r="0.8" fill={stroke} fillOpacity={dekking + 0.1} />
      {/* boog bij de 16, bulgt naar de middenlijn */}
      <path d="M 83 26 A 9 9 0 0 0 83 44" fill="none" stroke={stroke} strokeOpacity={dekking} strokeWidth="0.8" />
      {/* halve middencirkel bij de middellijn */}
      <path d="M 2 26 A 9 9 0 0 1 2 44" fill="none" stroke={stroke} strokeOpacity={dekking} strokeWidth="0.8" />
    </svg>
  );
}
