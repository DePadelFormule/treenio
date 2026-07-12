"use client";

import { useState } from "react";

interface Props {
  id: string;
  name?: string;
  label: string;
  autoComplete?: string;
  required?: boolean;
  value?: string;
  onChange?: (waarde: string) => void;
}

// Wachtwoordveld met oogje om de invoer zichtbaar te maken. Werkt zowel
// controlled (value + onChange) als uncontrolled (alleen name, formData leest 'm).
export function WachtwoordVeld({ id, name, label, autoComplete, required, value, onChange }: Props) {
  const [zichtbaar, setZichtbaar] = useState(false);

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-neutral-700">
        {label}
      </label>
      <div className="relative mt-1">
        <input
          id={id}
          name={name}
          type={zichtbaar ? "text" : "password"}
          autoComplete={autoComplete}
          required={required}
          value={value}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 pr-10 text-sm outline-none focus:border-sparta focus:ring-2 focus:ring-sparta/30"
        />
        <button
          type="button"
          onClick={() => setZichtbaar((z) => !z)}
          aria-label={zichtbaar ? "Wachtwoord verbergen" : "Wachtwoord tonen"}
          title={zichtbaar ? "Verbergen" : "Tonen"}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-neutral-400 hover:text-neutral-700"
        >
          {zichtbaar ? (
            // oog met streep (verbergen)
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
              <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
              <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
              <line x1="2" y1="2" x2="22" y2="22" />
            </svg>
          ) : (
            // open oog (tonen)
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
