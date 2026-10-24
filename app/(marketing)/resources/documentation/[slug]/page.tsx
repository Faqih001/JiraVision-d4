import type { Metadata } from "next"
import { notFound } from "next/navigation"

import DocReader from "@/components/doc-reader"
import { docSlugs, getDoc, relatedDocs } from "@/content/documentation"

type Props = { params: Promise<{ slug: string }> }

// The catalogue lives in-repo, so every slug is known at build time. Turning
// dynamic params off means an unknown slug is a framework 404 (correct status
// code) rather than a streamed not-found boundary under a 200.
export function generateStaticParams() {
  return docSlugs().map((slug) => ({ slug }))
}

export const dynamicParams = false

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const doc = getDoc(slug)

  if (!doc) return { title: "Documentation not found" }

  return {
    title: doc.title,
    description: doc.description,
    openGraph: {
      title: `${doc.title} | JiraVision Documentation`,
      description: doc.description,
      type: "article",
      url: `/resources/documentation/${doc.slug}`,
    },
  }
}

export default async function DocumentationSlugPage({ params }: Props) {
  const { slug } = await params
  const doc = getDoc(slug)

  if (!doc) notFound()

  return <DocReader doc={doc} related={relatedDocs(slug)} />
}
