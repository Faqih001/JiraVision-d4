import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="p-6 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Skeleton className="h-8 w-60 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-card border rounded-lg p-5 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
            <Skeleton className="h-7 w-20" />
            <div className="flex items-center space-x-1">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        ))}
      </div>

      {/* Chart and Data Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart Card */}
        <div className="bg-card border rounded-lg overflow-hidden">
          <div className="p-5 border-b">
            <Skeleton className="h-6 w-48" />
          </div>
          <div className="p-5">
            <div className="flex justify-between items-center mb-5">
              <Skeleton className="h-4 w-28" />
              <div className="flex space-x-2">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-20" />
              </div>
            </div>
            
            <div className="h-64 flex items-center justify-center">
              <Skeleton className="h-32 w-32 rounded-full" />
            </div>
          </div>
        </div>

        {/* Data Card */}
        <div className="bg-card border rounded-lg overflow-hidden">
          <div className="p-5 border-b">
            <Skeleton className="h-6 w-48" />
          </div>
          <div className="p-5 space-y-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-md flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-48" />
                  <div className="flex items-center gap-1">
                    <Skeleton className="h-4 w-full" />
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <Skeleton className="h-8 w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed Metrics Table */}
      <div className="bg-card border rounded-lg overflow-hidden">
        <div className="p-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Skeleton className="h-6 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-36" />
            <Skeleton className="h-9 w-28" />
          </div>
        </div>
        <div className="p-1">
          <div className="relative overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground bg-muted/50 uppercase">
                <tr>
                  <th className="px-5 py-3 text-left">
                    <Skeleton className="h-4 w-20" />
                  </th>
                  <th className="px-5 py-3 text-left">
                    <Skeleton className="h-4 w-24" />
                  </th>
                  <th className="px-5 py-3 text-left">
                    <Skeleton className="h-4 w-20" />
                  </th>
                  <th className="px-5 py-3 text-left">
                    <Skeleton className="h-4 w-16" />
                  </th>
                  <th className="px-5 py-3 text-left">
                    <Skeleton className="h-4 w-24" />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {[...Array(5)].map((_, i) => (
                  <tr key={i} className="bg-card hover:bg-muted/50 transition-colors">
                    <td className="px-5 py-4">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="px-5 py-4">
                      <Skeleton className="h-4 w-32" />
                    </td>
                    <td className="px-5 py-4">
                      <Skeleton className="h-4 w-16" />
                    </td>
                    <td className="px-5 py-4">
                      <Skeleton className="h-4 w-12" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-2 w-24 rounded-full" />
                        <Skeleton className="h-4 w-8" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="p-4 border-t flex items-center justify-between">
          <Skeleton className="h-5 w-48" />
          <div className="flex gap-1">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
      </div>
    </div>
  )
}
