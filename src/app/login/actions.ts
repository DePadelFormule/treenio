"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// E-mail/wachtwoord login via Supabase Auth. Bij succes stuurt de root-pagina
// daarna door op basis van rol.
export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/");

  if (!email || !password) {
    redirect(`/login?error=${encodeURIComponent("Vul e-mail en wachtwoord in.")}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent("Inloggen mislukt. Controleer je gegevens.")}`);
  }

  redirect(next.startsWith("/") ? next : "/");
}
