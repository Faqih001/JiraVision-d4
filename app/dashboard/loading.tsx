"use client"

import { CircleJVLoader } from "@/components/ui/loader"

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4">
      <CircleJVLoader size="lg" showText={true} />
    </div>
  )
}
        if (prev >= 100) {
          clearInterval(timer)
          return 100
        }
        return prev + 1.5
      })
    }, 50)

    const stepTimer = setInterval(() => {
      setLoadingSteps(steps => {
        const nextIncomplete = steps.findIndex(step => !step.complete)
        if (nextIncomplete === -1) {
          clearInterval(stepTimer)
          return steps
        }
        
        return steps.map((step, i) => {
          if (i === nextIncomplete) {
            return { ...step, complete: true }
          }
          return step
        })
      })
    }, 1000)

    return () => {
      clearInterval(timer)
      clearInterval(stepTimer)
    }
  }, [])

  return (
    <div className="flex min-h-screen flex-col">
      <div className="relative flex flex-col items-center justify-center flex-1 p-4">
        <div className="w-full max-w-xl mx-auto flex flex-col items-center">
          {/* Logo and loading indicator */}
          <div className="text-center mb-10">
            <div className="flex items-center justify-center">
              <div className="relative">
                <div className="w-20 h-20 flex items-center justify-center rounded-full bg-primary/10">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                </div>
                <div className="absolute inset-0">
                  <svg className="w-20 h-20" viewBox="0 0 100 100">
                    <circle 
                      className="text-muted stroke-[4]" 
                      cx="50" 
                      cy="50" 
                      r="40" 
                      strokeLinecap="round" 
                      fill="transparent" 
                    />
                    <circle 
                      className="text-primary stroke-[4] animate-dash" 
                      cx="50" 
                      cy="50" 
                      r="40" 
                      strokeLinecap="round" 
                      fill="transparent"
                      strokeDasharray="251" 
                      strokeDashoffset="251" 
                      style={{
                        strokeDashoffset: `${251 - (251 * progress) / 100}`,
                        transform: "rotate(-90deg)",
                        transformOrigin: "center"
                      }} 
                    />
                  </svg>
                </div>
              </div>
            </div>
            <h2 className="text-2xl font-bold mt-6 mb-2">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-500">
                JiraVision Dashboard
              </span>
            </h2>
            <p className="text-muted-foreground">Loading your workspace environment...</p>
          </div>
          
          {/* Progress bar */}
          <div className="w-full mb-8">
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary to-blue-400 transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }} 
              />
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-sm text-muted-foreground">Initializing</span>
              <span className="text-sm font-medium">{progress}%</span>
            </div>
          </div>

          {/* Loading steps with icons */}
          <div className="w-full space-y-2">
            {loadingSteps.map((step, index) => (
              <div 
                key={index}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg transition-all duration-300",
                  step.complete ? "bg-primary/5" : "bg-transparent"
                )}
              >
                {step.complete ? (
                  <CheckCircle2 className="h-5 w-5 text-primary animate-in fade-in zoom-in duration-300" />
                ) : (
                  <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30 border-t-primary animate-spin" />
                )}
                <span className={step.complete ? "text-foreground" : "text-muted-foreground"}>{step.name}</span>
              </div>
            ))}
          </div>
          
          {/* Feature highlights (visible when progress > 75%) */}
          {progress > 75 && (
            <div className="w-full mt-8 space-y-2 animate-in fade-in duration-500">
              <h3 className="text-sm font-medium text-center mb-4">Preparing Dashboard Features</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { icon: <BarChart3 className="h-5 w-5" />, label: "Analytics" },
                  { icon: <Users className="h-5 w-5" />, label: "Team" },
                  { icon: <Calendar className="h-5 w-5" />, label: "Sprints" },
                  { icon: <Sparkles className="h-5 w-5" />, label: "AI Scrum Master" },
                  { icon: <MessagesSquare className="h-5 w-5" />, label: "Chat" },
                ].map((feature, i) => (
                  <div 
                    key={`feature-${i}`}
                    className={cn(
                      "flex flex-col items-center justify-center p-3 rounded-lg bg-card border border-primary/10",
                      "transition-all duration-300 animate-in fade-in",
                    )}
                    style={{ animationDelay: `${i * 200}ms` }}
                  >
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                      {feature.icon}
                    </div>
                    <span className="text-xs font-medium">{feature.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Placeholder content to mimic the eventual dashboard layout */}
        {!isMobile && (
          <div className="absolute inset-0 -z-10 opacity-[0.03]">
            <div className="container h-full mx-auto p-8 flex gap-8">
              <div className="w-64 flex-shrink-0">
                <Skeleton className="h-10 w-10 rounded-full mb-4" />
                <Skeleton className="h-8 w-full mb-2" />
                <Skeleton className="h-8 w-full mb-2" />
                <Skeleton className="h-8 w-full mb-2" />
                <Skeleton className="h-8 w-3/4 mb-2" />
                <Skeleton className="h-8 w-full mb-2" />
              </div>
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-64 rounded-xl" />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
