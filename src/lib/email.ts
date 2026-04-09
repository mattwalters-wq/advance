import { Resend } from 'resend'

interface InviteEmailOptions {
  toEmail: string
  toName?: string
  invitedByName?: string
  invitedByEmail?: string
  role?: string
  tourNames?: string[]
  artistName?: string
  acceptUrl: string
}

export async function sendInviteEmail(opts: InviteEmailOptions) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const {
    toEmail,
    toName,
    invitedByName,
    invitedByEmail,
    role,
    tourNames,
    artistName,
    acceptUrl,
  } = opts

  const displayName = toName || toEmail.split('@')[0]
  const fromLabel = invitedByName || invitedByEmail || 'Someone'
  const accent = '#C4622D'

  const roleLabel = role
    ? role.charAt(0).toUpperCase() + role.slice(1).replace(/_/g, ' ')
    : 'Team member'

  const contextLine = artistName
    ? `You've been added as <strong>${roleLabel}</strong> on <strong>${artistName}</strong>${tourNames?.length ? ` for ${tourNames.join(', ')}` : ''}.`
    : `You've been invited to join Advance as <strong>${roleLabel}</strong>.`

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:#F7F3EE;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F3EE;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Header -->
          <tr>
            <td style="padding-bottom:28px;">
              <span style="font-family:Georgia,serif;font-style:italic;font-size:22px;color:#1A1714;">Advance</span>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border-radius:12px;border:1px solid #E8E0D4;overflow:hidden;">

              <!-- Accent bar -->
              <div style="height:4px;background:${accent};"></div>

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:36px 40px 28px;">

                    <p style="margin:0 0 24px;font-size:22px;font-weight:700;color:#1A1714;letter-spacing:-0.3px;">
                      You're in.
                    </p>

                    <p style="margin:0 0 16px;font-size:15px;color:#3A3530;line-height:1.6;">
                      Hi ${displayName},
                    </p>

                    <p style="margin:0 0 16px;font-size:15px;color:#3A3530;line-height:1.6;">
                      ${fromLabel} has invited you to <strong>Advance</strong> - tour management built for the way touring actually works.
                    </p>

                    <p style="margin:0 0 28px;font-size:15px;color:#3A3530;line-height:1.6;">
                      ${contextLine}
                    </p>

                    <!-- CTA -->
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="border-radius:8px;background:${accent};">
                          <a href="${acceptUrl}"
                            style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:0.2px;">
                            Accept invite
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style="margin:20px 0 0;font-size:12px;color:#8A8580;line-height:1.6;">
                      Or copy this link into your browser:<br/>
                      <span style="color:#C4622D;word-break:break-all;">${acceptUrl}</span>
                    </p>

                  </td>
                </tr>

                <!-- Footer inside card -->
                <tr>
                  <td style="padding:20px 40px;border-top:1px solid #F0EAE0;background:#FDFAF7;">
                    <p style="margin:0;font-size:12px;color:#8A8580;line-height:1.6;">
                      This invite was sent by ${fromLabel}${invitedByEmail ? ` (${invitedByEmail})` : ''}. If you weren't expecting this, you can ignore it.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:24px;">
              <p style="margin:0;font-size:11px;color:#8A8580;font-family:monospace;letter-spacing:1px;">
                GETADVANCE.CO
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const text = `Hi ${displayName},

${fromLabel} has invited you to Advance - tour management built for the way touring actually works.

${artistName ? `You've been added as ${roleLabel} on ${artistName}${tourNames?.length ? ` for ${tourNames.join(', ')}` : ''}.` : `You've been invited to join Advance as ${roleLabel}.`}

Accept your invite here:
${acceptUrl}

If you weren't expecting this, you can ignore it.

getadvance.co`

  return resend.emails.send({
    from: 'Advance <noreply@getadvance.co>',
    to: toEmail,
    subject: `You've been invited to Advance`,
    html,
    text,
  })
}
