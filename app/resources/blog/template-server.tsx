import type { ReactNode } from "react"
import Link from "next/link"
import { ChevronLeft, Calendar, Clock } from "lucide-react"

interface Author {
  name: string
  role: string
}

interface BlogPostTemplateProps {
  title: string
  excerpt: string
  content: ReactNode
  author: Author
  publishDate: string
  readTime: string
  tags: string[]
}

export default function BlogPostTemplate({
  title,
  excerpt,
  content,
  author,
  publishDate,
  readTime,
  tags = [],
}: BlogPostTemplateProps) {
  return (
    <div className="min-h-screen bg-white">
      {/* Back button */}
      <div className="container mx-auto px-4 py-6">
        <Link
          href="/resources/blog"
          className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back to Blog
        </Link>
      </div>

      {/* Cover image - using a div instead of Image component */}
      <div className="relative h-[300px] md:h-[500px] w-full bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-3xl">
          {/* Title and meta */}
          <div className="mb-8 text-center">
            <h1 className="mb-4 text-3xl font-bold tracking-tight text-gray-900 md:text-4xl lg:text-5xl">{title}</h1>
            <p className="mb-6 text-xl text-gray-600">{excerpt}</p>
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-gray-600">
              <div className="flex items-center">
                <div className="mr-2 h-8 w-8 rounded-full bg-gray-200"></div>
                <div>
                  <span className="font-medium text-gray-900">{author.name}</span>
                  <span className="mx-1">•</span>
                  <span>{author.role}</span>
                </div>
              </div>
              <div className="flex items-center">
                <Clock className="mr-1 h-4 w-4" />
                <span>{readTime}</span>
              </div>
              <div className="flex items-center">
                <Calendar className="mr-1 h-4 w-4" />
                <span>{publishDate}</span>
              </div>
            </div>
          </div>

          {/* Tags */}
          {tags && tags.length > 0 && (
            <div className="mb-8 flex flex-wrap gap-2">
              {tags.map((tag, index) => (
                <span key={index} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Main content */}
          <div className="prose prose-lg mx-auto max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-a:text-blue-600">
            {content}
          </div>

          {/* Author bio */}
          <div className="mt-12 rounded-lg bg-gray-50 p-6">
            <div className="flex items-center">
              <div className="mr-4 h-16 w-16 rounded-full bg-gray-200"></div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">About {author.name}</h3>
                <p className="text-gray-600">{author.role} at JiraVision</p>
              </div>
            </div>
            <p className="mt-4 text-gray-600">
              An experienced technology leader passionate about helping teams work more effectively with innovative
              tools and methodologies.
            </p>
          </div>

          {/* Newsletter signup */}
          <div className="mt-12 rounded-lg bg-blue-50 p-6">
            <div>
              <h3 className="mb-2 text-xl font-bold text-gray-900">Subscribe to our newsletter</h3>
              <p className="mb-4 text-gray-600">
                Get the latest insights on Agile methodologies and team productivity delivered to your inbox.
              </p>
              <form className="flex flex-col sm:flex-row gap-2">
                <input
                  type="email"
                  placeholder="Enter your email"
                  required
                  className="flex-1 rounded-md border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
                />
                <button
                  type="submit"
                  className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Subscribe
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
