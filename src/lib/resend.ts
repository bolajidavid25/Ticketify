import 'server-only'

export type ComplaintEmailInput = {
  id?: string | number
  name: string
  email: string
  category: string
  subject: string
  message: string
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

/**
 * Sends a complaint notification email via Resend after PostgreSQL persistence succeeds.
 * Failures are logged rather than thrown so saved complaints are never rejected.
 */
export async function sendComplaintNotificationEmail(input: ComplaintEmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('RESEND_API_KEY is not set; skipping Resend email notification.')
    return
  }

  const toEmail = process.env.SUPPORT_EMAIL || 'bolajidavid05@gmail.com'
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'Ticketify Support <onboarding@resend.dev>'

  const html = `
    <div style="font-family: Arial, sans-serif; color: #10271e; max-width: 600px;">
      <h2 style="margin-bottom: 8px;">New Ticketify Complaint${input.id != null ? ` (#${escapeHtml(String(input.id))})` : ''}</h2>
      <p style="margin: 4px 0;"><strong>From:</strong> ${escapeHtml(input.name)} (${escapeHtml(input.email)})</p>
      <p style="margin: 4px 0;"><strong>Category:</strong> ${escapeHtml(input.category)}</p>
      <p style="margin: 4px 0;"><strong>Subject:</strong> ${escapeHtml(input.subject)}</p>
      <hr style="border: none; border-top: 1px solid #dce4de; margin: 16px 0;" />
      <p style="white-space: pre-wrap; line-height: 1.6;">${escapeHtml(input.message)}</p>
    </div>
  `

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail],
        reply_to: input.email,
        subject: `[Ticketify · ${input.category}] ${input.subject}`,
        html,
        text: `New Ticketify Complaint\nFrom: ${input.name} (${input.email})\nCategory: ${input.category}\nSubject: ${input.subject}\n\n${input.message}`,
      }),
    })

    if (!res.ok) {
      const errorBody = await res.text()
      console.error('Resend email failed:', res.status, errorBody)
    }
  } catch (err) {
    console.error('Resend email request error:', err)
  }
}
