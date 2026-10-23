import { z } from "zod"

// Honeypot: hidden field real users never fill. Any non-empty value is treated
// as spam and answered with a fake success (see lib/forms/handler.ts).
const honeypot = z.string().max(255).optional()

const email = z.string().trim().min(1, "Email is required.").email("Enter a valid email address.").max(254)
const name = z.string().trim().min(2, "Enter your full name.").max(80)

const base = {
  name,
  email,
  website: honeypot,
}

export const contactSchema = z.object({
  ...base,
  company: z.string().trim().max(120).optional(),
  topic: z.enum(["general", "sales", "support", "partnership", "other"], {
    errorMap: () => ({ message: "Choose a topic." }),
  }),
  message: z.string().trim().min(10, "Tell us a bit more (at least 10 characters).").max(4000),
})

export const demoSchema = z.object({
  ...base,
  company: z.string().trim().min(2, "Company name is required.").max(120),
  teamSize: z.enum(["1-10", "11-50", "51-200", "200+"], {
    errorMap: () => ({ message: "Choose a team size." }),
  }),
  preferredDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date.")
    .refine((v) => new Date(v).getTime() > Date.now() - 24 * 3600 * 1000, "Pick an upcoming date."),
  // Filled from Intl on submit (components/forms/demo-form.tsx); optional here so
  // the hidden input never blocks client-side validation.
  timezone: z.string().trim().max(64).optional(),
  notes: z.string().trim().max(2000).optional(),
})

export const quoteSchema = z.object({
  ...base,
  company: z.string().trim().min(2, "Company name is required.").max(120),
  teamSize: z.enum(["1-10", "11-50", "51-200", "200+"], {
    errorMap: () => ({ message: "Choose a team size." }),
  }),
  goals: z.string().trim().min(20, "A sentence or two about your goals helps us prepare.").max(4000),
  timeframe: z.enum(["asap", "quarter", "exploring"]).optional(),
})

export const careersSchema = z.object({
  ...base,
  role: z.string().trim().min(2, "Select a role.").max(80),
  location: z.string().trim().max(120).optional(),
  portfolio: z
    .string()
    .trim()
    .url("Enter a valid URL (including https://).")
    .max(300)
    .optional()
    .or(z.literal("")),
  message: z.string().trim().min(20, "Tell us why you're a fit (at least 20 characters).").max(4000),
})

export const newsletterSchema = z.object({
  email,
  source: z.string().max(64).default("footer"),
  company: honeypot,
})

export type ContactInput = z.infer<typeof contactSchema>
export type DemoInput = z.infer<typeof demoSchema>
export type QuoteInput = z.infer<typeof quoteSchema>
export type CareersInput = z.infer<typeof careersSchema>
export type NewsletterInput = z.infer<typeof newsletterSchema>
