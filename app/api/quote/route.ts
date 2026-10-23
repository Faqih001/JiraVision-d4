import { formRoute } from "@/lib/forms/handler"
import { quoteSchema } from "@/lib/forms/schemas"

export const POST = formRoute({
  kind: "quote",
  schema: quoteSchema,
  subject: "Enterprise quote requested",
  emailTitle: "New enterprise quote request",
  labels: {
    name: "Name",
    email: "Email",
    company: "Company",
    teamSize: "Team size",
    goals: "Goals",
    timeframe: "Timeframe",
  },
})
