import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Fire geo capture and welcome email for OAuth signups
      const userId = sessionData?.session?.user?.id;
      if (userId) {
        try {
          // Check if this is a new user (no signup_ip means first login)
          const { createClient: createAdmin } = await import("@supabase/supabase-js");
          const admin = createAdmin(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
          );
          const { data: profile } = await admin.from("profiles").select("signup_ip").eq("id", userId).single();
          
          if (profile && !profile.signup_ip) {
            // New user - capture geo from Vercel headers
            const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
            await admin.from("profiles").update({
              signup_country: request.headers.get("x-vercel-ip-country") || null,
              signup_city: request.headers.get("x-vercel-ip-city") || null,
              signup_region: request.headers.get("x-vercel-ip-country-region") || null,
              signup_lat: request.headers.get("x-vercel-ip-latitude") ? parseFloat(request.headers.get("x-vercel-ip-latitude")) : null,
              signup_lng: request.headers.get("x-vercel-ip-longitude") ? parseFloat(request.headers.get("x-vercel-ip-longitude")) : null,
              signup_ip: ip,
            }).eq("id", userId);

            // Send welcome email
            try {
              await fetch(`${origin}/api/email/welcome`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId }),
              });
            } catch (e) { /* email failed, continue */ }
          }
        } catch (e) { /* non-critical, continue */ }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
