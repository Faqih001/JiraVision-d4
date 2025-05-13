"use client"

import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface ButtonLoaderProps {
  loading?: boolean
  children: React.ReactNode
  className?: string
  loaderClassName?: string
}

export function ButtonLoader({
  loading = true,
  children,
  className,
  loaderClassName
}: ButtonLoaderProps) {
  return (
    <div className={cn("flex items-center justify-center", className)}>
      {loading && (
        <Loader2 
          className={cn(
            "mr-2 h-4 w-4 animate-spin",
            loaderClassName
          )} 
        />
      )}
      {children}
    </div>
  )
}
