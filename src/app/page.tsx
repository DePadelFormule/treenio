import { redirect } from "next/navigation";
import { getHuidigeGebruiker } from "@/lib/auth";

// Entry point: stuurt door op basis van rol (role-based routing).
export default async function Home() {
  const gebruiker = await getHuidigeGebruiker();

  if (!gebruiker) redirect("/login");
  if (gebruiker.rol === "staf") redirect("/staf");
  if (gebruiker.rol === "speler") redirect("/paspoort");

  // Ingelogd maar nog niet gekoppeld aan een speler/staf-rij.
  redirect("/geen-koppeling");
}
