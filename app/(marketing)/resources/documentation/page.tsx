import type { Metadata } from "next"

import DocIndex from "@/components/doc-index"
import { docList } from "@/content/documentation"

export const metadata: Metadata = {
  title: "Documentation",
  description: `Setup guides, endpoint reference and troubleshooting for JiraVision — ${docList.length} documents covering the routes and APIs that exist in the product.`,
}

export default function DocumentationPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        <DocIndex />
      </main>
    </div>
  )
}
