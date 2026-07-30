import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { EmailOtpType } from "@supabase/supabase-js";

// Landingspunt voor auth-links uit e-mails (wachtwoord-herstel, uitnodiging).
// Ondersteunt beide vormen die Supabase kan sturen:
//   ?code=...                        → PKCE-code inwisselen voor een sessie
//   ?token_hash=...&type=recovery    → OTP verifiëren (werkt ook op een ander
//                                      apparaat dan waar de mail is aangevraagd)
// Bij succes door naar `next` (standaard nieuw-wachtwoord); bij een verlopen of
// al gebruikte link terug naar wachtwoord-vergeten met een duidelijke melding.
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const next = url.searchParams.get("next") ?? "/login/nieuw-wachtwoord";
  const veiligNext = next.startsWith("/") ? next : "/login/nieuw-wachtwoord";

  const supabase = await createClient();

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(veiligNext, url.origin));
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(veiligNext, url.origin));
  }

  return NextResponse.redirect(new URL("/login/wachtwoord-vergeten?fout=link", url.origin));
}
