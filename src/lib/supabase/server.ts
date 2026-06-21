import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/types/database";
import { SUPABASE_URL, SUPABASE_KEY } from "./config";

// Server-side Supabase client voor Server Components, Route Handlers en Actions.
// Leest/schrijft de auth-cookies zodat de sessie meekomt en RLS van toepassing is.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    SUPABASE_URL,
    SUPABASE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // setAll faalt in Server Components (read-only cookies). Dat is oké
            // zolang de middleware de sessie ververst.
          }
        },
      },
    },
  );
}
