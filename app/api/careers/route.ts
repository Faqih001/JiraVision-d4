import { formRoute } from "@/lib/forms/handler"
import { careersSchema } from "@/lib/forms/schemas"

export const POST = formRoute({
  kind: "careers",
  schema: careersSchema,
  subject: "Job application",
  emailTitle: "New job application",
  maxPerMinute: 2,
  labels: {
    name: "Name",
    email: "Email",
    role: "Role",
    location: "Location",
    portfolio: "Portfolio / LinkedIn",
    message: "Why you're a fit",
  },
})
