export default function CaseStudyLoading() {
  return (
    <div className="container mx-auto py-12 px-4">
      <div className="animate-pulse">
        <div className="h-8 bg-muted rounded w-3/4 mb-4"></div>
        <div className="h-4 bg-muted rounded w-1/2 mb-12"></div>
        <div className="h-64 bg-muted rounded mb-8"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="col-span-3">
            <div className="h-4 bg-muted rounded w-full mb-4"></div>
            <div className="h-4 bg-muted rounded w-full mb-4"></div>
            <div className="h-4 bg-muted rounded w-3/4 mb-8"></div>
            <div className="h-4 bg-muted rounded w-full mb-4"></div>
            <div className="h-4 bg-muted rounded w-full mb-4"></div>
            <div className="h-4 bg-muted rounded w-5/6 mb-8"></div>
          </div>
          <div className="col-span-1">
            <div className="h-32 bg-muted rounded mb-4"></div>
            <div className="h-4 bg-muted rounded w-full mb-2"></div>
            <div className="h-4 bg-muted rounded w-full mb-2"></div>
            <div className="h-4 bg-muted rounded w-3/4 mb-4"></div>
          </div>
        </div>
      </div>
    </div>
  )
}
