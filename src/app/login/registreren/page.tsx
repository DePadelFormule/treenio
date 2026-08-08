import Link from "next/link";
import { registreer } from "../actions";
import { WachtwoordVeld } from "@/components/WachtwoordVeld";

export default async function RegistrerenPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; verstuurd?: string }>;
}) {
  const { error, verstuurd } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-sparta-black p-4">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="h-2 bg-sparta" />
        <div className="p-8">
          <div className="mb-6 text-center">
            <h1 className="text-3xl font-extrabold tracking-tight text-sparta">Treenio</h1>
            <p className="mt-1 text-sm font-semibold text-neutral-700">Nivo Sparta JO17-2</p>
            <p className="mt-1 text-sm text-neutral-500">Account aanmaken (trainers)</p>
          </div>

          {verstuurd ? (
            <div className="space-y-4">
              <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
                Bijna klaar! Er is een bevestigingsmail gestuurd naar{" "}
                <span className="font-medium">{verstuurd}</span>. Klik op de link in die mail
                (op dit apparaat) om je account te activeren.
              </p>
              <p className="text-center text-sm">
                <Link href="/login" className="text-neutral-500 hover:text-sparta hover:underline">
                  ← Naar inloggen
                </Link>
              </p>
            </div>
          ) : (
            <>
              {error ? (
                <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
              ) : null}

              <form action={registreer} className="space-y-4">
                <div>
                  <label htmlFor="naam" className="block text-sm font-medium text-neutral-700">
                    Naam
                  </label>
                  <input
                    id="naam"
                    name="naam"
                    type="text"
                    autoComplete="name"
                    required
                    placeholder="Voor- en achternaam"
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-sparta focus:ring-2 focus:ring-sparta/30"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-neutral-700">
                    E-mail
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-sparta focus:ring-2 focus:ring-sparta/30"
                  />
                </div>
                <WachtwoordVeld id="password" name="password" label="Wachtwoord" autoComplete="new-password" required />
                <div>
                  <label htmlFor="code" className="block text-sm font-medium text-neutral-700">
                    Registratiecode
                  </label>
                  <input
                    id="code"
                    name="code"
                    type="text"
                    required
                    placeholder="Krijg je van de hoofdtrainer"
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-sparta focus:ring-2 focus:ring-sparta/30"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full rounded-lg bg-sparta px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sparta-dark"
                >
                  Account aanmaken
                </button>
              </form>

              <p className="mt-4 text-center text-sm">
                <Link href="/login" className="text-neutral-500 hover:text-sparta hover:underline">
                  ← Ik heb al een account
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
