import { NextResponse } from "next/server";
import { SUPABASE_URL, SUPABASE_KEY } from "@/lib/supabase/config";

// Houdt het gratis Supabase-project wakker. Supabase pauzeert een project na
// ±7 dagen zonder verkeer — precies wat er in de winterstop gebeurt. Vercel
// roept deze route dagelijks aan (zie vercel.json → crons); één klein
// databaseverzoek telt als activiteit en voorkomt de slaapstand.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/spelers?select=id&limit=1`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      cache: "no-store",
    });
    return NextResponse.json({ ok: res.ok, status: res.status });
  } catch (e) {
    return NextResponse.json(
      { ok: false, fout: e instanceof Error ? e.message : "onbekend" },
      { status: 500 },
    );
  }
}
