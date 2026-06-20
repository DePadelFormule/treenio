import { SignOutButton } from "@/components/SignOutButton";

// Fallback voor ingelogde gebruikers die nog niet aan een speler- of staf-rij
// gekoppeld zijn (auth_user_id ontbreekt). De staf koppelt ze handmatig.
export default function GeenKoppelingPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow">
        <h1 className="text-xl font-bold text-neutral-800">Bijna klaar</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Je bent ingelogd, maar je account is nog niet gekoppeld aan een
          speler- of stafprofiel. Vraag je coach om je te koppelen.
        </p>
        <div className="mt-6 flex justify-center">
          <SignOutButton />
        </div>
      </div>
    </main>
  );
}
