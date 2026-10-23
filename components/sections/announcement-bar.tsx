"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { X } from "lucide-react"
import { announcement } from "@/content/site"

const DISMISS_KEY = "jv-announcement-dismissed"

export function AnnouncementBar() {
  const [dismissed, setDismissed] = useState(true)

  // Start hidden until we know the dismissal state, to avoid a hydration flash.
  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY) === "1")
  }, [])

  if (dismissed) return null

  return (
    <div className="border-b border-primary-foreground/10 bg-primary text-primary-foreground">
      <div className="container flex h-9 items-center justify-between gap-3 text-xs md:text-sm">
        <Link href={announcement.href} className="group flex min-w-0 items-center gap-2 font-medium hover:underline">
          <span className="shrink-0 rounded-full bg-primary-foreground/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
            {announcement.label}
          </span>
          <span className="truncate">{announcement.text}</span>
          <span aria-hidden="true" className="transition-transform duration-150 group-hover:translate-x-0.5">
            &rarr;
          </span>
        </Link>
        <button
          type="button"
          aria-label="Dismiss announcement"
          className="shrink-0 rounded p-1 transition-colors duration-150 hover:bg-primary-foreground/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-foreground"
          onClick={() => {
            setDismissed(true)
            localStorage.setItem(DISMISS_KEY, "1")
          }}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
