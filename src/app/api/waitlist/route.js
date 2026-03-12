import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { name, email, artist, message } = await request.json();

    if (!name || !email || !artist) {
      return NextResponse.json({ error: "missing fields" }, { status: 400 });
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "stamps land <hello@stamps-land.com>",
        to: "info@mondamgmt.com",
        reply_to: email,
        subject: `waitlist: ${artist}`,
        html: `
          <div style="font-family: sans-serif; max-width: 480px; padding: 20px;">
            <h2 style="margin: 0 0 20px; font-size: 18px; color: #1A1018;">new waitlist signup</h2>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #1A1018;">
              <tr>
                <td style="padding: 8px 0; color: #6A5A62; width: 100px;">name</td>
                <td style="padding: 8px 0; font-weight: 600;">${name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6A5A62;">email</td>
                <td style="padding: 8px 0;"><a href="mailto:${email}" style="color: #8B1A2B;">${email}</a></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6A5A62;">artist</td>
                <td style="padding: 8px 0; font-weight: 600;">${artist}</td>
              </tr>
              ${message ? `<tr>
                <td style="padding: 8px 0; color: #6A5A62; vertical-align: top;">message</td>
                <td style="padding: 8px 0;">${message}</td>
              </tr>` : ""}
            </table>
            <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #E8DDD4; font-size: 11px; color: #6A5A6277;">
              sent from stamps-land.com waitlist
            </div>
          </div>
        `,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Resend error:", err);
      return NextResponse.json({ error: "email failed" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Waitlist error:", err);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
