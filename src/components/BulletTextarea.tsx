"use client";

// Textarea met zichtbare opsommingstekens: een onzichtbare (tekst-transparante)
// textarea ligt precies over een laag die dezelfde tekst wél toont, met "•"
// voor elke niet-lege regel. Typen gebeurt in de echte textarea (normale
// cursor, geen trucs nodig), de laag erachter bepaalt de hoogte via de
// normale tekstdoorloop — dus geen losse hoogteberekening nodig en geen
// interne scrollbalk.
export function BulletTextarea({
  value,
  onChange,
  placeholder,
  wrapperClassName = "w-full rounded-lg border border-neutral-300",
  textClassName = "px-2 py-1.5 text-sm text-neutral-800",
}: {
  value: string;
  onChange: (waarde: string) => void;
  placeholder?: string;
  wrapperClassName?: string;
  textClassName?: string;
}) {
  const regels = value.split("\n");

  return (
    <div className={`relative ${wrapperClassName}`}>
      <div aria-hidden className={`pointer-events-none whitespace-pre-wrap break-words ${textClassName}`}>
        {value ? (
          regels.map((r, i) => <div key={i}>{r.trim() ? `• ${r}` : " "}</div>)
        ) : (
          <span className="text-neutral-400">{placeholder}</span>
        )}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        spellCheck={false}
        className={`absolute inset-0 resize-none overflow-hidden whitespace-pre-wrap break-words bg-transparent text-transparent caret-neutral-800 outline-none print:hidden ${textClassName}`}
      />
    </div>
  );
}
