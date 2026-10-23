import { formRoute } from "@/lib/forms/handler"
import { contactSchema } from "@/lib/forms/schemas"

export const POST = formRoute({
  kind: "contact",
  schema: contactSchema,
  subject: "New contact form message",
  emailTitle: "New contact message from the marketing site",
  labels: {
    name: "Name",
    email: "Email",
    company: "Company",
    topic: "Topic",
    message: "Message",
  },
})
