import type { Metadata } from "next"
import { notFound } from "next/navigation"

import BlogReader from "@/components/blog-reader"
import { blogSlugs, getPost } from "@/content/blog"

// Every post lives in content/blog.ts, so every slug is known at build time.
// Turning dynamic params off keeps an unknown slug a framework 404 instead of a
// streamed not-found boundary that commits headers under HTTP 200.
export function generateStaticParams() {
  return blogSlugs().map((slug) => ({ slug }))
}

export const dynamicParams = false

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = getPost(slug)
  if (!post) {
    return { title: "Article not found", robots: { index: false, follow: true } }
  }
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/resources/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: `/resources/blog/${post.slug}`,
      type: "article",
      publishedTime: post.publishedOn,
      images: [{ url: post.image, alt: post.imageAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      images: [post.image],
    },
  }
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = getPost(slug)
  if (!post) notFound()

  return <BlogReader post={post} />
}
