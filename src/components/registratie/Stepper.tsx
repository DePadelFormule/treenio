"use client";

interface StepperProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

// Compacte +/- tikteller voor de iPad-invoer.
export function Stepper({ label, value, onChange, min = 0, max = 99 }: StepperProps) {
  const omlaag = () => onChange(Math.max(min, value - 1));
  const omhoog = () => onChange(Math.min(max, value + 1));

  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm text-neutral-600">{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={omlaag}
          aria-label={`${label} omlaag`}
          className="h-9 w-9 rounded-full bg-neutral-200 text-lg font-bold text-neutral-700 active:scale-95 disabled:opacity-40"
          disabled={value <= min}
        >
          −
        </button>
        <span className="w-7 text-center text-base font-bold tabular-nums">{value}</span>
        <button
          type="button"
          onClick={omhoog}
          aria-label={`${label} omhoog`}
          className="h-9 w-9 rounded-full bg-pitch text-lg font-bold text-white active:scale-95 disabled:opacity-40"
          disabled={value >= max}
        >
          +
        </button>
      </div>
    </div>
  );
}
