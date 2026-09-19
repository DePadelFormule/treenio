import { redirect } from "next/navigation";

// Spelerskaarten is samengevoegd met Team-overzicht (één scherm, twee
// weergaven). Oude links/bladwijzers blijven werken.
export default function SpelersPage() {
  redirect("/staf/team?weergave=kaarten");
}
