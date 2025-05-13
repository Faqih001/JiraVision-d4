import { Skeleton } from "@/components/ui/skeleton"
import { Loader, PulseLoader, SkeletonCard } from "@/components/ui/loader"

export default function EmailLoading() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-32" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Email Sidebar Skeleton */}
        <div className="md:col-span-3 lg:col-span-2 bg-card rounded-lg border p-4 space-y-4">
          <Skeleton className="h-10 w-full" />
          
          <div className="relative">
            <div className="absolute left-2.5 top-2.5">
              <Loader size="sm" />
            </div>
            <Skeleton className="h-10 w-full pl-8" />
          </div>

          <div className="space-y-2">
            {Array(6)
              .fill(0)
              .map((_, i) => (
                <div key={`folder-${i}`} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 flex items-center justify-center">
                      <Loader size="sm" className="opacity-25" />
                    </div>
                    <Skeleton className="h-4 w-16" />
                  </div>
                  {i < 3 && <Skeleton className="h-4 w-4 rounded-sm" />}
                </div>
              ))}
          </div>

          <Skeleton className="h-1 w-full" />

          <div>
            <div className="flex items-center justify-between mb-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-5 w-5 rounded-full" />
            </div>
            <div className="space-y-2">
              {Array(5)
                .fill(0)
                .map((_, i) => (
                  <div key={`label-${i}`} className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary/10 animate-pulse" 
                      style={{ 
                        animationDelay: `${i * 120}ms`,
                        backgroundColor: i === 0 ? '#ef4444' : 
                                         i === 1 ? '#3b82f6' : 
                                         i === 2 ? '#22c55e' : 
                                         i === 3 ? '#f59e0b' : 
                                         '#a855f7'
                      }} 
                    />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
            </div>
          </div>

          <Skeleton className="h-1 w-full" />
          
          <div>
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-2">
                <Skeleton className="h-4 w-16" />
                <Loader size="sm" className="opacity-30" />
              </div>
              <div className="w-full h-2 rounded-full bg-muted">
                <div className="bg-blue-500 h-2 rounded-full w-[65%] animate-pulse" />
              </div>
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
        </div>

        {/* Email Content Skeleton */}
        <div className="md:col-span-9 lg:col-span-10 bg-card rounded-lg border overflow-hidden">
          <div className="p-3 border-b flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-8 w-8 rounded" />
              <div className="flex items-center gap-1">
                <Loader size="sm" className="opacity-50" />
                <Loader size="sm" className="opacity-50" />
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-20 rounded" />
              <Skeleton className="h-4 w-4 rounded" />
            </div>
          </div>

          <div className="divide-y">
            {Array(5)
              .fill(0)
              .map((_, i) => (
                <div key={`email-${i}`} className="p-3 flex gap-3 hover:bg-muted/50" style={{ animationDelay: `${i * 150}ms` }}>
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center gap-1 pt-1">
                      <Skeleton className="h-4 w-4 rounded" />
                      <Skeleton className="h-5 w-5 rounded" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-6 w-6 rounded-full" />
                          <Skeleton className="h-4 w-32" />
                        </div>
                        <Skeleton className="h-4 w-16" />
                      </div>
                      
                      <Skeleton className="h-4 w-3/4 mb-1" />
                      
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-1">
                          <div className="h-2 w-2 rounded-full bg-red-500 opacity-50" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                        {i % 2 === 0 && (
                          <div className="ml-auto flex items-center gap-1">
                            <Loader size="sm" className="opacity-30" />
                            <Skeleton className="h-3 w-4" />
                          </div>
                        )}
                      </div>
                      
                      <Skeleton className="h-4 w-full mt-1" />
                    </div>
                  </div>
                </div>
              ))}
          </div>
          
          {/* Loading indicator overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 hover:opacity-100 transition-opacity">
            <div className="bg-black/5 backdrop-blur-sm w-full h-full flex items-center justify-center">
              <div className="flex flex-col items-center">
                <Loader size="lg" />
                <p className="mt-4 font-medium">Loading your emails...</p>
                <PulseLoader className="mt-2" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
