import { signup } from "@/lib/auth-actions"
import { authResult, gate, serverError } from "../_respond"

// A successful signup is not refunded to the budget: the whole point here is a ceiling on how many
// accounts one address or one IP can open.
export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const email = formData.get("email")

    const { blocked } = gate(request, "signup", typeof email === "string" ? email : undefined)
    if (blocked) return blocked

    return authResult(await signup(formData))
  } catch (error) {
    console.error("Signup route error:", error)
    return serverError()
  }
}
