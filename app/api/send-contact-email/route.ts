import { NextResponse } from "next/server"
import { Resend } from "resend"

const resend = new Resend(process.env.JIRAVISION_RESEND_API)

export async function POST(request: Request) {
  try {
    const { name, email, subject, message } = await request.json()

    if (!name || !email || !subject || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const { data, error } = await resend.emails.send({
      from: "JiraVision Contact <onboarding@resend.dev>",
      to: "fakiiahmad@gmail.com",
      subject: `Contact Form: ${subject}`,
      reply_to: email,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #7c3aed; margin-bottom: 20px;">New Contact Form Submission</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <div style="margin-top: 20px; margin-bottom: 20px; padding: 15px; background-color: #f9f9f9; border-left: 4px solid #7c3aed; border-radius: 4px;">
            <p><strong>Message:</strong></p>
            <p>${message.replace(/\n/g, "<br>")}</p>
          </div>
          <p style="color: #666; font-size: 14px; margin-top: 30px;">This email was sent from the JiraVision contact form.</p>
        </div>
      `,
    })

    if (error) {
      console.error("Error sending email:", error)
      return NextResponse.json({ error: "Failed to send email" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in contact form API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
