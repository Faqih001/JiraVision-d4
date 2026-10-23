import { formRoute } from "@/lib/forms/handler"
import { demoSchema } from "@/lib/forms/schemas"

export const POST = formRoute({
  kind: "demo",
  schema: demoSchema,
  subject: "Demo booked",
  emailTitle: "New demo booking",
  labels: {
    name: "Name",
    email: "Email",
    company: "Company",
    teamSize: "Team size",
    preferredDate: "Preferred date",
    timezone: "Timezone",
    notes: "Notes",
  },
})
