"use client";

// Opent de printdialoog van de browser; daarin kun je ook "Bewaar als PDF"
// kiezen (op iPad: Deel → Afdrukken → knijp open → Bewaar in Bestanden).
export function PrintKnop({ label = "Print / bewaar als PDF" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-lg bg-sparta px-4 py-1.5 text-sm font-semibold text-white hover:bg-sparta-dark print:hidden"
    >
      {label}
    </button>
  );
}
