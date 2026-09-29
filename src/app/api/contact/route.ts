import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { escapeHtml, EMAIL_FROM } from '@/lib/email'

const resend = new Resend(process.env.RESEND_API_KEY)

const MAX_NAME = 200
const MAX_EMAIL = 320
const MAX_MESSAGE = 5000

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const name = typeof body?.name === 'string' ? body.name.trim() : ''
    const email = typeof body?.email === 'string' ? body.email.trim() : ''
    const message = typeof body?.message === 'string' ? body.message.trim() : ''
    if (!name || !email || !message) {
      return NextResponse.json({ error: 'All fields required' }, { status: 400 })
    }
    if (name.length > MAX_NAME || email.length > MAX_EMAIL || message.length > MAX_MESSAGE) {
      return NextResponse.json({ error: `Too long — name max ${MAX_NAME}, message max ${MAX_MESSAGE} characters` }, { status: 400 })
    }
    if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 })
    }

    const { error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: 'info@mondamgmt.com',
      replyTo: email,
      // Strip CR/LF so the subject can't be used for header injection
      subject: `Advance enquiry from ${name.replace(/[\r\n]+/g, ' ')}`,
      html: `
        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Message:</strong></p>
        <p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>
      `,
    })
    if (error) {
      return NextResponse.json({ error: 'Could not send your message. Please try again later.' }, { status: 502 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
