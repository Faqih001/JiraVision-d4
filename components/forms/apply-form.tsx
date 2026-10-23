"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { CheckCircle2, Send } from "lucide-react"

import { careersSchema, type CareersInput } from "@/lib/forms/schemas"
import { applyFieldErrors, postForm } from "@/lib/forms/submit"
import { track } from "@/lib/analytics"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { HoneypotField } from "@/components/forms/honeypot-field"

export function ApplyForm({ role, onDone }: { role: string; onDone?: () => void }) {
  const [sent, setSent] = useState(false)
  const form = useForm<CareersInput>({
    resolver: zodResolver(careersSchema),
    defaultValues: { name: "", email: "", role, location: "", portfolio: "", message: "", website: "" },
  })

  async function onSubmit(values: CareersInput) {
    const res = await postForm("/api/careers", values)
    if (res.ok) {
      setSent(true)
      track("job_application_submitted", { role })
      return
    }
    applyFieldErrors(form.setError, res.fields, res.error)
  }

  if (sent) {
    return (
      <div role="status" className="flex items-start gap-3 rounded-xl border border-border bg-success/10 p-5">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
        <div>
          <p className="font-medium">Application sent.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Thanks for applying to {role}. If there&rsquo;s a fit, you&rsquo;ll hear from us within a week.
          </p>
        </div>
        {onDone && (
          <Button type="button" variant="ghost" size="sm" onClick={onDone} className="ml-auto shrink-0">
            Close
          </Button>
        )}
      </div>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <p className="rounded-lg bg-muted px-3 py-2 text-sm">
          Applying for <span className="font-medium">{role}</span>
        </p>
        <input type="hidden" {...form.register("role")} />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full name</FormLabel>
                <FormControl>
                  <Input autoComplete="name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location (optional)</FormLabel>
                <FormControl>
                  <Input placeholder="City, country" autoComplete="address-level2" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="portfolio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Portfolio or LinkedIn (optional)</FormLabel>
              <FormControl>
                <Input type="url" placeholder="https://…" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Why you, why this role?</FormLabel>
              <FormControl>
                <Textarea rows={5} placeholder="A short note beats a long CV — tell us what you'd fix first." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <HoneypotField />
        {form.formState.errors.root?.message && (
          <p role="alert" className="text-sm text-destructive">
            {form.formState.errors.root.message}
          </p>
        )}
        <Button type="submit" className="w-full rounded-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Sending…" : "Send application"}
          {!form.formState.isSubmitting && <Send className="ml-2 h-4 w-4" aria-hidden="true" />}
        </Button>
      </form>
    </Form>
  )
}
