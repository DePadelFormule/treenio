// Simpele opmaak voor Academy-secties: **vet**, en regels die met "- "
// beginnen worden een lijstje. Lege regel = nieuwe alinea. Geen HTML/markdown
// library nodig — bewust minimaal, dit is platte tekst met een paar tekens.

function inlineVet(tekst: string, key: string) {
  const delen = tekst.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return delen.map((deel, i) =>
    deel.startsWith("**") && deel.endsWith("**") ? (
      <strong key={`${key}-${i}`}>{deel.slice(2, -2)}</strong>
    ) : (
      <span key={`${key}-${i}`}>{deel}</span>
    ),
  );
}

export function AcademyTekst({ tekst }: { tekst: string }) {
  const alineas = tekst.split(/\n{2,}/).map((a) => a.trim()).filter(Boolean);

  return (
    <div className="space-y-3">
      {alineas.map((alinea, i) => {
        const regels = alinea.split("\n").map((r) => r.trim()).filter(Boolean);
        const isLijst = regels.length > 0 && regels.every((r) => r.startsWith("- "));
        if (isLijst) {
          return (
            <ul key={i} className="ml-5 list-disc space-y-1 text-sm text-neutral-700">
              {regels.map((r, j) => (
                <li key={j}>{inlineVet(r.slice(2), `${i}-${j}`)}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="whitespace-pre-line text-sm text-neutral-700">
            {inlineVet(alinea, `${i}`)}
          </p>
        );
      })}
    </div>
  );
}
