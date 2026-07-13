import Link from "next/link";
import { login } from "./actions";
import { WachtwoordVeld } from "@/components/WachtwoordVeld";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-sparta-black p-4">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="h-2 bg-sparta" />
        <div className="p-8">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-sparta">
            Treenio
          </h1>
          <p className="mt-1 text-sm font-semibold text-neutral-700">
            Nivo Sparta JO17-2
          </p>
          <p className="mt-1 text-sm text-neutral-500">
            Log in als trainer.
          </p>
        </div>

        {error ? (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <form action={login} className="space-y-4">
          <input type="hidden" name="next" value={next ?? "/"} />
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
          <WachtwoordVeld id="password" name="password" label="Wachtwoord" autoComplete="current-password" required />
          <button
            type="submit"
            className="w-full rounded-lg bg-sparta px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sparta-dark"
          >
            Inloggen
          </button>
        </form>

        <p className="mt-4 text-center text-sm">
          <Link href="/login/wachtwoord-vergeten" className="text-neutral-500 hover:text-sparta hover:underline">
            Wachtwoord vergeten?
          </Link>
        </p>
        </div>
      </div>
    </main>
  );
}
