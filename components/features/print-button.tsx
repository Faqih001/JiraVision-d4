"use client"

import { Button } from "@/components/ui/button"
import { Printer } from "lucide-react"

/**
 * Small client island that triggers the browser print dialog
 * (Print / Save as PDF). Kept intentionally minimal so it can be
 * embedded from server components like LegalDoc and the one-pager.
 */
export function PrintButton({
  label = "Print / Save as PDF",
  variant = "outline",
}: {
  label?: string
  variant?: "outline" | "default"
}) {
  return (
    <Button
      type="button"
      variant={variant}
      size="sm"
      className="gap-2 rounded-full"
      onClick={() => {
        window.print()
      }}
    >
      <Printer className="h-4 w-4" aria-hidden="true" />
      {label}
    </Button>
  )
}
