// Provider-agnostic email adapter. Uses Resend when JIRAVISION_RESEND_API is set;
// otherwise logs to the server console (local/dev) so flows stay testable without credentials.

export interface EmailMessage {
  to: string
  subject: string
  html: string
  text?: string
  replyTo?: string
}

export const EMAIL_FROM = process.env.JIRAVISION_EMAIL_FROM ?? "JiraVision <onboarding@resend.dev>"
// TODO(owner): confirm the inbox that should receive form notifications.
export const TEAM_INBOX = process.env.JIRAVISION_TEAM_EMAIL ?? "info@jiravision.com"
export const SUPPORT_EMAIL = process.env.JIRAVISION_SUPPORT_EMAIL ?? "support@jiravision.com"

export async function sendEmail(message: EmailMessage): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.JIRAVISION_RESEND_API
  if (!apiKey) {
    console.info("[email:dev] not sent — JIRAVISION_RESEND_API unset", {
      to: message.to,
      subject: message.subject,
      body: message.text ?? message.html.slice(0, 400),
    })
    return { ok: true }
  }

  try {
    const { Resend } = await import("resend")
    const resend = new Resend(apiKey)
    const { error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
      replyTo: message.replyTo,
    })
    if (error) {
      console.error("[email] send failed:", error)
      return { ok: false, error: error.message }
    }
    return { ok: true }
  } catch (err) {
    console.error("[email] provider error:", err)
    return { ok: false, error: err instanceof Error ? err.message : "unknown" }
  }
}

/** Minimal shared styling for notification emails. */
export function emailTemplate(title: string, rows: [string, string][], footer?: string): { html: string; text: string } {
  const text = [title, ...rows.map(([k, v]) => `${k}: ${v}`), footer ?? ""].join("\n")
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#2F4A3F">${title}</h2>
      <table style="width:100%;border-collapse:collapse">
        ${rows
          .map(
            ([k, v]) =>
              `<tr><td style="padding:6px 8px;border-bottom:1px solid #eee;font-weight:bold;color:#555;width:160px">${escapeHtml(k)}</td><td style="padding:6px 8px;border-bottom:1px solid #eee">${escapeHtml(v)}</td></tr>`,
          )
          .join("")}
      </table>
      ${footer ? `<p style="color:#777;font-size:13px;margin-top:20px">${escapeHtml(footer)}</p>` : ""}
    </div>`
  return { html, text }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}
