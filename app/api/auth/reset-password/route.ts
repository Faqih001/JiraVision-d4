import { resetPassword } from "@/lib/auth-actions"
import { authResult, gate, serverError } from "../_respond"

// No email here: the token is the capability, so the only budget worth spending is the IP's.
export async function POST(request: Request) {
  try {
    const formData = await request.formData()

    const { blocked } = gate(request, "reset-password")
    if (blocked) return blocked

    return authResult(await resetPassword(formData))
  } catch (error) {
    console.error("Reset password route error:", error)
    return serverError()
  }
}
