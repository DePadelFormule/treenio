import { redirect } from "next/navigation";
import { getHuidigeGebruiker } from "@/lib/auth";

// Entry point. Treenio is volledig staf-only: alleen trainers loggen in.
export default async function Home() {
  const gebruiker = await getHuidigeGebruiker();

  if (!gebruiker) redirect("/login");
  if (gebruiker.rol === "staf") redirect("/staf");

  // Ingelogd maar geen staf → geen toegang.
  redirect("/geen-toegang");
}
