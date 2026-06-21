import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-pitch-dark p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-pitch">
            Treenio
          </h1>
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
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-pitch focus:ring-2 focus:ring-pitch/30"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-neutral-700">
              Wachtwoord
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-pitch focus:ring-2 focus:ring-pitch/30"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-pitch px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-pitch-dark"
          >
            Inloggen
          </button>
        </form>
      </div>
    </main>
  );
}
