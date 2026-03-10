import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    const { postId, authorName, content, feedType } = await req.json();
    if (!postId) return Response.json({ error: "missing postId" }, { status: 400 });

    // Get all users with email notifications enabled
    const { data: subscribers } = await supabaseAdmin
      .from("profiles")
      .select("id, display_name, email_notifications")
      .eq("email_notifications", true);

    if (!subscribers || subscribers.length === 0) {
      return Response.json({ success: true, sent: 0 });
    }

    // Get emails for all subscribers
    const emails = [];
    for (const sub of subscribers) {
      const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(sub.id);
      if (user?.email) {
        emails.push({ id: sub.id, email: user.email, name: sub.display_name });
      }
    }

    if (emails.length === 0) return Response.json({ success: true, sent: 0 });

    const preview = content?.length > 100 ? content.slice(0, 100) + "..." : content;
    const domain = process.env.RESEND_DOMAIN || "stamps-land.com";

    // Send emails in batches via Resend batch API
    const batchEmails = emails.map((recipient) => ({
      from: process.env.RESEND_DOMAIN_VERIFIED === "true"
        ? `the stamps <hello@${domain}>`
        : "stamps land <onboarding@resend.dev>",
      to: recipient.email,
      subject: `${authorName?.toLowerCase() || "the stamps"} posted in stamps land ✦`,
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px; background: #F5EFE6;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="font-size: 24px; margin-bottom: 4px;">✦</div>
            <div style="font-size: 11px; color: #6A5A62; letter-spacing: 2px; text-transform: lowercase;">stamps land</div>
          </div>
          
          <div style="background: #FAF5F0; border-radius: 10px; padding: 20px; border: 1px solid #E8DDD4; margin-bottom: 24px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
              <div style="width: 32px; height: 32px; border-radius: 8px; background: #8B1A2B; color: #FAF5F0; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700;">✦</div>
              <div>
                <div style="font-size: 14px; font-weight: 600; color: #1A1018; text-transform: lowercase;">${authorName?.toLowerCase() || "the stamps"}</div>
                <div style="font-size: 10px; color: #6A5A62;">just now</div>
              </div>
            </div>
            <p style="font-size: 14px; color: #1A1018; line-height: 1.6; margin: 0;">${preview || ""}</p>
          </div>
          
          <div style="text-align: center; margin-bottom: 32px;">
            <a href="https://${domain}" style="display: inline-block; padding: 14px 32px; background: #8B1A2B; color: #FAF5F0; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">
              see the full post ✦
            </a>
          </div>
          
          <p style="font-size: 11px; color: #6A5A62; text-align: center; line-height: 1.6;">
            you're receiving this because you have email notifications on in stamps land.<br>
            <a href="https://${domain}" style="color: #8B1A2B; text-decoration: none;">turn off in settings</a>
          </p>
        </div>
      `,
    }));

    // Send via Resend batch endpoint
    const res = await fetch("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify(batchEmails),
    });

    const result = await res.json();

    // Log emails
    for (const recipient of emails) {
      await supabaseAdmin.from("email_log").insert({
        recipient_id: recipient.id,
        email_type: "band_post",
        subject: `${authorName?.toLowerCase()} posted in stamps land`,
      });
    }

    return Response.json({ success: true, sent: emails.length });
  } catch (e) {
    console.error("Band post email error:", e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
