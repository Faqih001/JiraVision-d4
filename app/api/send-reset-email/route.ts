import { NextResponse } from "next/server"
import { Resend } from "resend"

const resend = new Resend(process.env.JIRAVISION_RESEND_API)

export async function POST(request: Request) {
  try {
    const { email, resetToken } = await request.json()

    if (!email || !resetToken) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/reset-password?token=${resetToken}`

    const { data, error } = await resend.emails.send({
      from: "JiraVision <onboarding@resend.dev>",
      to: email,
      subject: "Reset Your JiraVision Password",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #7c3aed; padding: 20px; text-align: center; color: white;">
            <h1 style="margin: 0;">JiraVision</h1>
          </div>
          <div style="padding: 20px; border: 1px solid #e5e5e5; border-top: none;">
            <h2 style="color: #333; margin-top: 0;">Reset Your Password</h2>
            <p>Hello,</p>
            <p>We received a request to reset your password for your JiraVision account. Click the button below to reset it:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background-color: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">Reset Password</a>
            </div>
            <p>If you didn't request a password reset, you can safely ignore this email.</p>
            <p>This link will expire in 1 hour for security reasons.</p>
            <p>If the button above doesn't work, copy and paste the following URL into your browser:</p>
            <p style="word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 4px; font-size: 14px;">${resetUrl}</p>
            <p style="margin-top: 30px; color: #666; font-size: 14px;">
              Regards,<br>
              The JiraVision Team
            </p>
          </div>
          <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
            <p>&copy; ${new Date().getFullYear()} JiraVision. All rights reserved.</p>
          </div>
        </div>
      `,
    })

    if (error) {
      console.error("Error sending email:", error)
      return NextResponse.json({ error: "Failed to send email" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in reset email API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
