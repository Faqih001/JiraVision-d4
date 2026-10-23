"use client"

import { useState, useSyncExternalStore } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { CalendarCheck, CheckCircle2 } from "lucide-react"

import { demoSchema, type DemoInput } from "@/lib/forms/schemas"
import { applyFieldErrors, postForm } from "@/lib/forms/submit"
import { track } from "@/lib/analytics"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { HoneypotField } from "@/components/forms/honeypot-field"

const teamSizes = ["1-10", "11-50", "51-200", "200+"] as const

const subscribeNoop = () => () => {}
const getMounted = () => true
const getServerUnmounted = () => false

export function DemoForm() {
  const [sent, setSent] = useState(false)
  const mounted = useSyncExternalStore(subscribeNoop, getMounted, getServerUnmounted)
  const timezone = mounted ? Intl.DateTimeFormat().resolvedOptions().timeZone : ""
  const form = useForm<DemoInput>({
    resolver: zodResolver(demoSchema),
    defaultValues: { name: "", email: "", company: "", teamSize: "11-50", preferredDate: "", timezone: "", notes: "", website: "" },
  })

  async function onSubmit(values: DemoInput) {
    const payload: DemoInput = {
      ...values,
      timezone: values.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    }
    const res = await postForm("/api/demo", payload)
    if (res.ok) {
      setSent(true)
      track("demo_requested")
      return
    }
    applyFieldErrors(form.setError, res.fields, res.error)
  }

  if (sent) {
    return (
      <div role="status" className="flex items-start gap-3 rounded-xl border border-border bg-success/10 p-6">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
        <div>
          <p className="font-medium">Demo requested.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            We&rsquo;ll email you within one business day to confirm the time.
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
                <FormLabel>Company</FormLabel>
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
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="teamSize"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Team size</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose team size" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {teamSizes.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s} people
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
            name="preferredDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Preferred date</FormLabel>
                <FormControl>
                  <Input type="date" min={new Date().toISOString().slice(0, 10)} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <input type="hidden" aria-hidden="true" {...form.register("timezone")} />
        <p className="text-xs text-muted-foreground">
          {timezone ? `We’ll propose times in ${timezone}.` : "Detecting your timezone…"}
        </p>
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Anything specific you want covered? (optional)</FormLabel>
              <FormControl>
                <Textarea rows={3} placeholder="Tools you use, teams involved, questions…" {...field} />
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
          {form.formState.isSubmitting ? "Requesting…" : "Request a demo"}
          {!form.formState.isSubmitting && <CalendarCheck className="ml-2 h-4 w-4" aria-hidden="true" />}
        </Button>
      </form>
    </Form>
  )
}
