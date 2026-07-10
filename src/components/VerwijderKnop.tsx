"use client";

interface Props {
  action: (formData: FormData) => void | Promise<void>;
  id: string;
  bevestig: string;
  label?: string;
}

// Kleine verwijder-knop met bevestiging vooraf.
export function VerwijderKnop({ action, id, bevestig, label = "Verwijderen" }: Props) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(bevestig)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="rounded-lg px-2 py-1.5 text-sm font-medium text-neutral-400 hover:text-red-600"
      >
        {label}
      </button>
    </form>
  );
}
