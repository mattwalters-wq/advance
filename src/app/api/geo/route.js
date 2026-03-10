import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    const body = await req.json();
    const { userId, timezone, language } = body;
    if (!userId) return Response.json({ error: "missing userId" }, { status: 400 });

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() 
      || req.headers.get("x-real-ip") 
      || "unknown";

    // Try Vercel headers first
    let city = req.headers.get("x-vercel-ip-city");
    let country = req.headers.get("x-vercel-ip-country");
    let region = req.headers.get("x-vercel-ip-country-region");
    let lat = req.headers.get("x-vercel-ip-latitude");
    let lng = req.headers.get("x-vercel-ip-longitude");

    if (city) city = decodeURIComponent(city);

    // If no Vercel headers, try to infer from timezone
    if (!country && timezone) {
      const tzCountryMap = {
        "Australia/Melbourne": "AU", "Australia/Sydney": "AU", "Australia/Brisbane": "AU",
        "Australia/Perth": "AU", "Australia/Adelaide": "AU", "Australia/Hobart": "AU",
        "Europe/London": "GB", "Europe/Berlin": "DE", "Europe/Paris": "FR",
        "Europe/Amsterdam": "NL", "Europe/Vienna": "AT", "Europe/Zurich": "CH",
        "America/New_York": "US", "America/Chicago": "US", "America/Los_Angeles": "US",
        "America/Toronto": "CA", "America/Vancouver": "CA",
        "Pacific/Auckland": "NZ",
      };
      country = tzCountryMap[timezone] || null;
      // Extract city from timezone (e.g. "Australia/Melbourne" -> "Melbourne")
      if (timezone && timezone.includes("/")) {
        city = timezone.split("/").pop().replace(/_/g, " ");
      }
    }

    const geo = {
      signup_city: city || null,
      signup_country: country || null,
      signup_region: region || null,
      signup_lat: lat ? parseFloat(lat) : null,
      signup_lng: lng ? parseFloat(lng) : null,
      signup_ip: ip,
    };

    // Use security definer function to bypass RLS
    const { error } = await supabaseAdmin.rpc("update_user_geo", {
      target_user_id: userId,
      geo_city: city || null,
      geo_country: country || null,
      geo_region: region || null,
      geo_lat: lat ? parseFloat(lat) : null,
      geo_lng: lng ? parseFloat(lng) : null,
      geo_ip: ip,
    });

    return Response.json({ success: !error, geo, error: error?.message });
  } catch (e) {
    console.error("Geo capture error:", e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
