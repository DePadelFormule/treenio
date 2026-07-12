import Link from "next/link";
import { redirect } from "next/navigation";
import { getHuidigeGebruiker } from "@/lib/auth";
import { WachtwoordWijzigen } from "@/components/WachtwoordWijzigen";

export default async function AccountPage() {
  const gebruiker = await getHuidigeGebruiker();
  if (!gebruiker) redirect("/login");
  if (gebruiker.rol !== "staf") redirect("/");

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/staf" className="text-sm text-neutral-500 hover:text-sparta hover:underline">
        ← Terug naar dashboard
      </Link>

      <h1 className="mb-1 mt-4 text-2xl font-bold text-sparta">Mijn account</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Ingelogd als <span className="font-medium text-neutral-700">{gebruiker.staf?.naam}</span>
        {gebruiker.email ? <span className="text-neutral-400"> · {gebruiker.email}</span> : null}
      </p>

      <h2 className="mb-3 text-sm font-semibold text-neutral-700">Wachtwoord wijzigen</h2>
      <WachtwoordWijzigen />
    </main>
  );
}
