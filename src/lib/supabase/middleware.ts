import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/types/database";
import { SUPABASE_URL, SUPABASE_KEY } from "./config";

// Ververst de Supabase-sessie bij elke request en beschermt routes.
// Belangrijk: altijd de meegegeven `supabaseResponse` teruggeven zodat de
// ververste auth-cookies bij de browser aankomen.
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    SUPABASE_URL,
    SUPABASE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic =
    path === "/" ||
    path.startsWith("/login") ||
    path.startsWith("/auth") ||
    path.startsWith("/vragenlijst") || // spelers vullen deze in zonder inlog
    path.startsWith("/academy"); // handboek + quiz, spelers lezen zonder inlog

  // Niet ingelogd en geen publieke route → naar /login.
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  // Alleen voor de hoofdtrainer (mag_conclusie): de afgeronde positie-
  // inventarisatie en de AI-lesgenerator (kost geld per gegenereerde les) met
  // het lessenarchief. Alle andere staf-pagina's zijn voor alle trainers.
  // We schermen dit hier centraal af, niet alleen in het menu, zodat directe
  // URL's ook geblokkeerd worden.
  const alleenHoofdtrainer =
    path.startsWith("/staf/posities") ||
    path.startsWith("/staf/lesgenerator") ||
    path.startsWith("/staf/lessen");
  if (user && alleenHoofdtrainer) {
    const { data: staf } = await supabase
      .from("staf")
      .select("mag_conclusie")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    if (!(staf as { mag_conclusie: boolean } | null)?.mag_conclusie) {
      const url = request.nextUrl.clone();
      url.pathname = "/staf";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
