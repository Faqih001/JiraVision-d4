"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { CheckCircle2, Send } from "lucide-react"

import { contactSchema, type ContactInput } from "@/lib/forms/schemas"
import { applyFieldErrors, postForm } from "@/lib/forms/submit"
import { track } from "@/lib/analytics"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { HoneypotField } from "@/components/forms/honeypot-field"

const topics = [
  { value: "general", label: "General inquiry" },
  { value: "sales", label: "Sales question" },
  { value: "support", label: "Technical support" },
  { value: "partnership", label: "Partnership" },
  { value: "other", label: "Something else" },
]

export function ContactForm() {
  const [sent, setSent] = useState(false)
  const form = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: "", email: "", company: "", topic: "general", message: "", website: "" },
  })

  async function onSubmit(values: ContactInput) {
    const res = await postForm("/api/contact", values)
    if (res.ok) {
      setSent(true)
      track("contact_form_submitted", { topic: values.topic })
      return
    }
    applyFieldErrors(form.setError, res.fields, res.error)
  }

  if (sent) {
    return (
      <div role="status" className="flex items-start gap-3 rounded-xl border border-border bg-success/10 p-6">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
        <div>
          <p className="font-medium">Message sent.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            We reply within one business day. If it&rsquo;s urgent, call or WhatsApp the number on this page.
          </p>
        </div>
      </div>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full name</FormLabel>
                <FormControl>
                  <Input placeholder="Ada Wanjiru" autoComplete="name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="company"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company (optional)</FormLabel>
                <FormControl>
                  <Input placeholder="Acme Ltd" autoComplete="organization" {...field} />
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
              <FormLabel>Work email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="you@company.com" autoComplete="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="topic"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Topic</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a topic" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {topics.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Message</FormLabel>
              <FormControl>
                <Textarea rows={5} placeholder="How can we help?" {...field} />
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
          {form.formState.isSubmitting ? "Sending…" : "Send message"}
          {!form.formState.isSubmitting && <Send className="ml-2 h-4 w-4" aria-hidden="true" />}
        </Button>
        <p className="text-xs text-muted-foreground">
          Protected by rate limiting. We only use your details to answer this enquiry.
        </p>
      </form>
    </Form>
  )
}
