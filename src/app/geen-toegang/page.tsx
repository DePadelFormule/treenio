import { SignOutButton } from "@/components/SignOutButton";

// Treenio is uitsluitend voor de trainersstaf. Een ingelogde gebruiker die
// niet aan een staf-profiel gekoppeld is, ziet deze pagina.
export default function GeenToegangPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow">
        <h1 className="text-xl font-bold text-neutral-800">Geen toegang</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Treenio is alleen voor de trainersstaf. Dit account is niet gekoppeld
          aan een stafprofiel.
        </p>
        <div className="mt-6 flex justify-center">
          <SignOutButton />
        </div>
      </div>
    </main>
  );
}
