"use client"

import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface LoaderProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg"
  text?: string
  className?: string
}

export function Loader({ size = "md", text, className, ...props }: LoaderProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12"
  }
  
  return (
    <div 
      className={cn(
        "flex flex-col items-center justify-center", 
        className
      )} 
      {...props}
    >
      <div className="relative">
        <Loader2 className={cn("animate-spin text-primary", sizeClasses[size])} />
      </div>
      {text && (
        <p className="mt-2 text-sm text-muted-foreground">{text}</p>
      )}
    </div>
  )
}

interface PulseLoaderProps extends React.HTMLAttributes<HTMLDivElement> {
  count?: number
  className?: string
}

export function PulseLoader({ count = 3, className, ...props }: PulseLoaderProps) {
  return (
    <div 
      className={cn(
        "flex items-center space-x-2", 
        className
      )} 
      {...props}
    >
      {[...Array(count)].map((_, i) => (
        <div 
          key={i}
          className={cn(
            "h-2 w-2 bg-primary rounded-full animate-pulse",
            i === 0 ? "opacity-100" : i === 1 ? "opacity-80" : "opacity-60",
            i === 0 ? "delay-0" : i === 1 ? "delay-150" : "delay-300"
          )}
        />
      ))}
    </div>
  )
}

interface SkeletonCardProps {
  className?: string
  header?: boolean
  footer?: boolean
  lines?: number
}

export function SkeletonCard({ 
  className, 
  header = true,
  footer = false, 
  lines = 3 
}: SkeletonCardProps) {
  return (
    <div className={cn(
      "rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden",
      className
    )}>
      {header && (
        <div className="p-6 border-b">
          <div className="space-y-2">
            <div className="h-5 w-1/3 bg-muted rounded-md animate-pulse" />
            <div className="h-4 w-1/2 bg-muted/70 rounded-md animate-pulse" />
          </div>
        </div>
      )}
      
      <div className="p-6 space-y-4">
        {[...Array(lines)].map((_, i) => (
          <div 
            key={i}
            className={cn(
              "h-4 bg-muted rounded-md animate-pulse",
              i === 0 ? "w-full" : i === 1 ? "w-[85%]" : "w-[70%]",
              i === 0 ? "delay-0" : i === 1 ? "delay-100" : "delay-200"
            )}
          />
        ))}
      </div>
      
      {footer && (
        <div className="p-6 border-t flex justify-between items-center">
          <div className="h-9 w-24 bg-muted rounded-md animate-pulse" />
          <div className="h-9 w-24 bg-muted rounded-md animate-pulse" />
        </div>
      )}
    </div>
  )
}

interface DashboardLoaderProps {
  className?: string
  columns?: number
}

export function DashboardLoader({ className, columns = 2 }: DashboardLoaderProps) {
  return (
    <div className={cn("w-full p-6", className)}>
      <div className="mb-8 space-y-4">
        <div className="h-8 w-1/4 bg-muted rounded-md animate-pulse" />
        <div className="h-4 w-1/3 bg-muted/70 rounded-md animate-pulse" />
      </div>
      
      <div className={cn(
        "grid gap-6",
        columns === 1 ? "grid-cols-1" : 
        columns === 2 ? "grid-cols-1 md:grid-cols-2" :
        "grid-cols-1 md:grid-cols-3"
      )}>
        {[...Array(columns * 2)].map((_, i) => (
          <SkeletonCard 
            key={i}
            lines={i % 3 + 2} 
            footer={i % 2 === 0}
          />
        ))}
      </div>
    </div>
  )
}

interface CircleJVLoaderProps {
  className?: string
  size?: "sm" | "md" | "lg" | "xl"
  showText?: boolean
}

export function CircleJVLoader({ className, size = "md", showText = false }: CircleJVLoaderProps) {
  const sizeClasses = {
    sm: "h-16 w-16 text-xs",
    md: "h-24 w-24 text-sm",
    lg: "h-32 w-32 text-base",
    xl: "h-40 w-40 text-lg"
  }
  
  return (
    <div className={cn(
      "flex flex-col items-center justify-center gap-3",
      className
    )}>
      <div 
        className={cn(
          "relative rounded-full border-4 border-primary animate-[spin_3s_linear_infinite]",
          sizeClasses[size]
        )}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-bold tracking-tighter">JV</span>
        </div>
        {/* Inner pulsing circle */}
        <div className="absolute inset-1 rounded-full border-2 border-primary/30 animate-pulse" />
      </div>
      
      {showText && (
        <p className="text-sm text-muted-foreground animate-pulse">
          Loading JiraVision...
        </p>
      )}
    </div>
  )
}
