import { createBrowserClient } from "@supabase/ssr";

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    cookieOptions: {
      name: "sb-session",
      lifetime: 60 * 60 * 24 * 365, // 1 year
      domain: "",
      path: "/",
      sameSite: "lax",
      secure: true,
    },
  }
);
