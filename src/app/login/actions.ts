"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
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

// Zelf een trainersaccount aanmaken: e-mail + wachtwoord + registratiecode.
// De code wordt eerst gecontroleerd (nette melding); daarna dubbelt een
// database-trigger die controle en maakt hij de staf-rij aan met beperkte
// toegang. Volledige toegang geeft de hoofdtrainer daarna bewust.
export async function registreer(formData: FormData) {
  const naam = String(formData.get("naam") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const code = String(formData.get("code") ?? "").trim();

  const fout = (m: string) => redirect(`/login/registreren?error=${encodeURIComponent(m)}`);

  if (!naam || !email || !password || !code) fout("Vul alle velden in.");
  if (password.length < 6) fout("Kies een wachtwoord van minstens 6 tekens.");

  const supabase = await createClient();

  const { data: codeOk } = await supabase.rpc("check_registratie_code", { code } as never);
  if (!codeOk) fout("De registratiecode klopt niet. Vraag de hoofdtrainer om de juiste code.");

  const hdrs = await headers();
  const origin = hdrs.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { naam, registratie_code: code },
      emailRedirectTo: `${origin}/auth/confirm?next=/staf`,
    },
  });

  if (error) {
    fout("Aanmelden mislukt: " + error.message);
  }
  // Bestaand e-mailadres: Supabase geeft dan een user zonder identities terug.
  if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    fout("Er bestaat al een account met dit e-mailadres. Gebruik 'Wachtwoord vergeten' als je er niet in kunt.");
  }

  // Is e-mailbevestiging uitgeschakeld, dan is er direct een sessie.
  if (data?.session) redirect("/staf");
  redirect(`/login/registreren?verstuurd=${encodeURIComponent(email)}`);
}
