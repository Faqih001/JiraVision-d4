"use client"

import { useState } from "react"
import { ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { newsletter } from "@/content/site"
import { cn } from "@/lib/utils"

type Status = "idle" | "loading" | "success" | "error"

/**
 * Newsletter signup. Posts to the real /api/newsletter endpoint (rate limited
 * to 5 per minute per IP) with a honeypot field. `inverse` is for use on a
 * `bg-primary` CTA band, so it resolves against `--primary-foreground` rather
 * than a literal white and stays legible in both themes.
 */
export default function NewsletterForm({
  source,
  inverse = false,
  showHeading = true,
}: {
  source: string
  inverse?: boolean
  showHeading?: boolean
}) {
  const [status, setStatus] = useState<Status>("idle")

  return (
    <div>
      {showHeading ? (
        <>
          <h3 className={cn("mb-2 text-sm font-semibold", inverse && "text-primary-foreground")}>
            {newsletter.title}
          </h3>
          <p className={cn("mb-4 text-sm", inverse ? "text-primary-foreground/75" : "text-muted-foreground")}>
            {newsletter.description}
          </p>
        </>
      ) : null}
      {status === "success" ? (
        <p
          className={cn("text-sm", inverse ? "text-primary-foreground" : "text-success")}
          role="status"
        >
          {newsletter.successNotice}
        </p>
      ) : (
        <form
          className="flex gap-2"
          onSubmit={async (event) => {
            event.preventDefault()
            const data = new FormData(event.currentTarget)
            setStatus("loading")
            try {
              const res = await fetch(newsletter.endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  email: data.get("email"),
                  source,
                  // Honeypot: real users never fill this; bots do.
                  company: data.get("company") ?? "",
                }),
              })
              setStatus(res.ok ? "success" : "error")
            } catch {
              setStatus("error")
            }
          }}
        >
          <input
            type="text"
            name="company"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="absolute left-[-9999px] h-0 w-0 opacity-0"
          />
          <Input
            type="email"
            name="email"
            required
            placeholder="you@company.com"
            aria-label="Email address"
            className={cn(
              "min-w-0 flex-1",
              inverse
                ? "border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/60"
                : "bg-background",
            )}
            disabled={status === "loading"}
          />
          <Button
            type="submit"
            size="icon"
            aria-label="Subscribe"
            variant={inverse ? "secondary" : "default"}
            disabled={status === "loading"}
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
        </form>
      )}
      {status === "error" ? (
        <p className={cn("mt-2 text-sm", inverse ? "text-primary-foreground" : "text-destructive")} role="alert">
          Something went wrong. Please try again — the limit is 5 signups per minute.
        </p>
      ) : null}
    </div>
  )
}
