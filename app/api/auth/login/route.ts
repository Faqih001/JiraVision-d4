import { login } from "@/lib/auth-actions"
import { authResult, gate, refundAttempts, serverError } from "../_respond"

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const email = formData.get("email")

    const { blocked, keys } = gate(request, "login", typeof email === "string" ? email : undefined)
    if (blocked) return blocked

    const result = await login(formData)
    if (result.success) refundAttempts(keys)

    return authResult(result)
  } catch (error) {
    console.error("Login route error:", error)
    return serverError()
  }
}
