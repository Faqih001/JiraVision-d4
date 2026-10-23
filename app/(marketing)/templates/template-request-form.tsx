"use client"

// Request-a-template form. It posts to the existing /api/contact route handler
// (lib/forms/handler.ts: honeypot → rate limit → zod → inbox), composing the
// chosen template into the message field — no new endpoint needed.

import { useState } from "react"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowRight, CheckCircle2, Send } from "lucide-react"
import { contactSchema, type ContactInput } from "@/lib/forms/schemas"
import { applyFieldErrors, postForm } from "@/lib/forms/submit"
import { track } from "@/lib/analytics"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { HoneypotField } from "@/components/forms/honeypot-field"
import { Section, SectionHeading } from "@/components/sections/section"
import { templates } from "@/content/templates"

export function TemplateRequestForm() {
  const [sent, setSent] = useState(false)
  const [picked, setPicked] = useState("")
  const form = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: "", email: "", company: "", topic: "general", message: "", website: "" },
  })

  async function onSubmit(values: ContactInput) {
    const prefix = picked ? `Template request — ${picked}: ` : "Template request: "
    const res = await postForm("/api/contact", { ...values, message: `${prefix}${values.message}` })
    if (res.ok) {
      setSent(true)
      track("contact_form_submitted", { topic: "general", source: "templates-page" })
      return
    }
    applyFieldErrors(form.setError, res.fields, res.error)
  }

  return (
    <Section id="request" bg="contour">
      <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <div>
          <SectionHeading
            className="mb-4"
            eyebrow="Ask for a change"
            title="Request a template"
            intro="Want one bent to your workflow — or a routine that isn't on the shelf yet? Tell us here. This form posts to the same inbox as every other message on this site, and a human who works on the product reads it."
          />
          <p className="text-sm leading-relaxed text-muted-foreground">
            Prefer the full form, a demo booking or a quote request? They're all tabs on{" "}
            <Link
              href="/contact"
              className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
            >
              the contact page
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
            .
          </p>
        </div>

        <div className="rounded-lg border bg-card p-6 shadow-soft">
          {sent ? (
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
              <div>
                <h3 className="font-display text-lg font-medium tracking-tight">Request sent</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  It landed in the team inbox with your template choice attached. Small
                  adaptations get answered honestly; things the product refuses to measure
                  or rank won't be adapted into existence either way.
                </p>
                <Button asChild variant="outline" size="sm" className="mt-4 rounded-full">
                  <Link href="/templates#library">Back to the library</Link>
                </Button>
              </div>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <HoneypotField />
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Your name</FormLabel>
                        <FormControl>
                          <Input placeholder="Ada Ndegwa" autoComplete="name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Work email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="ada@team.dev" autoComplete="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Studio name" autoComplete="organization" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div>
                  <label htmlFor="template-pick" className="text-sm font-medium leading-none">
                    Which template? (optional)
                  </label>
                  <select
                    id="template-pick"
                    value={picked}
                    onChange={(e) => setPicked(e.target.value)}
                    className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Something else / not sure yet</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.title}>
                        {t.title} ({t.category})
                      </option>
                    ))}
                  </select>
                </div>
                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>What would you do with it?</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={4}
                          placeholder="e.g. adapt the after-hours recovery plan for a support team that shares on-call with engineering…"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={form.formState.isSubmitting} className="rounded-full gap-2">
                  <Send className="h-4 w-4" aria-hidden />
                  {form.formState.isSubmitting ? "Sending…" : "Send request"}
                </Button>
                {form.formState.errors.root?.message && (
                  <p className="text-sm text-destructive" role="alert">
                    {form.formState.errors.root.message}
                  </p>
                )}
              </form>
            </Form>
          )}
        </div>
      </div>
    </Section>
  )
}
