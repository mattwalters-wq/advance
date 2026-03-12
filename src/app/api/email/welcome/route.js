import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    const { userId } = await req.json();
    if (!userId) return Response.json({ error: "missing userId" }, { status: 400 });

    // Get user profile
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("display_name, email_notifications")
      .eq("id", userId)
      .single();

    if (!profile) return Response.json({ error: "profile not found" }, { status: 404 });

    // Get user email from auth
    const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (!user?.email) return Response.json({ error: "no email" }, { status: 404 });

    // Send welcome email via Resend
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: process.env.RESEND_DOMAIN_VERIFIED === "true" 
        ? `the stamps <hello@${process.env.RESEND_DOMAIN || "stamps-land.com"}>` 
        : "stamps land <onboarding@resend.dev>",
        to: user.email,
        subject: "you're in ✦",
        html: `
          <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px; background: #F5EFE6;">
            <div style="text-align: center; margin-bottom: 32px;">
              <div style="font-size: 32px; margin-bottom: 8px;">✦</div>
              <h1 style="font-size: 28px; font-weight: 700; color: #1A1018; margin: 0; text-transform: lowercase;">welcome to stamps land</h1>
            </div>
            
            <p style="font-size: 15px; color: #1A1018; line-height: 1.7; margin-bottom: 16px;">
              hey ${profile.display_name?.toLowerCase() || "friend"} <3
            </p>
            
            <p style="font-size: 15px; color: #1A1018; line-height: 1.7; margin-bottom: 16px;">
              we made this little corner of the internet for the people who actually care about what we're doing. no algorithm telling you what to see, no ads, just us and you.
            </p>
            
            <p style="font-size: 15px; color: #1A1018; line-height: 1.7; margin-bottom: 16px;">
              we post here when we're writing, when we're on tour, when we find something that inspires us. and you can post too - this is a community, not a broadcast.
            </p>
            
            <p style="font-size: 15px; color: #1A1018; line-height: 1.7; margin-bottom: 16px;">
              the more you hang out here the more stamps you earn - post, comment, bring a friend, check in at a show. the stamps unlock real stuff from us. merch, signed vinyl, hangouts. the works.
            </p>
            
            <p style="font-size: 15px; color: #1A1018; line-height: 1.7; margin-bottom: 24px;">
              so glad you're here.
            </p>
            
            <p style="font-size: 15px; color: #1A1018; line-height: 1.7; margin-bottom: 24px;">
              sof, scar & rubi x
            </p>
            
            <div style="text-align: center; margin-bottom: 32px;">
              <a href="https://${process.env.RESEND_DOMAIN || "stamps-land.com"}" style="display: inline-block; padding: 14px 32px; background: #8B1A2B; color: #FAF5F0; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">
                come say hi ✦
              </a>
            </div>
            
            <p style="font-size: 12px; color: #6A5A62; text-align: center; line-height: 1.6;">
              you're receiving this because you signed up for stamps land.<br>
              you can turn off email notifications in your profile settings.
            </p>
          </div>
        `,
      }),
    });

    const result = await res.json();

    // Log the email
    await supabaseAdmin.from("email_log").insert({
      recipient_id: userId,
      email_type: "welcome",
      subject: "welcome to stamps land ✦",
    });

    return Response.json({ success: true, id: result.id });
  } catch (e) {
    console.error("Welcome email error:", e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
