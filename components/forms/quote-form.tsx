"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { CheckCircle2, Calculator } from "lucide-react"

import { quoteSchema, type QuoteInput } from "@/lib/forms/schemas"
import { applyFieldErrors, postForm } from "@/lib/forms/submit"
import { track } from "@/lib/analytics"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { HoneypotField } from "@/components/forms/honeypot-field"

const teamSizes = ["1-10", "11-50", "51-200", "200+"] as const
const timeframes = [
  { value: "asap", label: "As soon as possible" },
  { value: "quarter", label: "This quarter" },
  { value: "exploring", label: "Still exploring" },
] as const

export function QuoteForm() {
  const [sent, setSent] = useState(false)
  const form = useForm<QuoteInput>({
    resolver: zodResolver(quoteSchema),
    defaultValues: { name: "", email: "", company: "", teamSize: "11-50", goals: "", timeframe: "quarter", website: "" },
  })

  async function onSubmit(values: QuoteInput) {
    const res = await postForm("/api/quote", values)
    if (res.ok) {
      setSent(true)
      track("quote_requested")
      return
    }
    applyFieldErrors(form.setError, res.fields, res.error)
  }

  if (sent) {
    return (
      <div role="status" className="flex items-start gap-3 rounded-xl border border-border bg-success/10 p-6">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
        <div>
          <p className="font-medium">Quote request received.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            We&rsquo;ll send a tailored price within one business day.
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
          name="timeframe"
          render={({ field }) => (
            <FormItem>
              <FormLabel>When would you start?</FormLabel>
              <FormControl>
                <RadioGroup
                  className="grid grid-cols-1 gap-2 sm:grid-cols-3"
                  onValueChange={field.onChange}
                  value={field.value}
                >
                  {timeframes.map((t) => (
                    <FormItem key={t.value}>
                      <FormLabel className="flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg border border-border p-3 text-sm font-normal transition-colors hover:bg-muted data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                        <FormControl>
                          <RadioGroupItem value={t.value} />
                        </FormControl>
                        {t.label}
                      </FormLabel>
                    </FormItem>
                  ))}
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="goals"
          render={({ field }) => (
            <FormItem>
              <FormLabel>What are you hoping to fix or achieve?</FormLabel>
              <FormControl>
                <Textarea rows={4} placeholder="e.g. visible workload across four squads, calmer sprint planning…" {...field} />
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
          {form.formState.isSubmitting ? "Sending…" : "Get my quote"}
          {!form.formState.isSubmitting && <Calculator className="ml-2 h-4 w-4" aria-hidden="true" />}
        </Button>
      </form>
    </Form>
  )
}
