"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { ChevronLeft, Clock } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"

interface Author {
  name: string
  role: string
  avatar?: string // Make avatar optional
}

interface BlogPostTemplateProps {
  title: string
  excerpt: string
  content: React.ReactNode
  author?: Author // Make author optional
  publishDate: string
  readTime: string
  coverImage?: string // Make coverImage optional
  tags?: string[] // Make tags optional
}

// Default author object to use if none is provided
const DEFAULT_AUTHOR: Author = {
  name: "JiraVision Team",
  role: "Editorial Team",
  avatar: "/placeholder.svg?height=200&width=200",
}

export default function BlogPostTemplate({
  title,
  excerpt,
  content,
  author = DEFAULT_AUTHOR, // Provide default author
  publishDate,
  readTime,
  coverImage = "/placeholder.svg?height=1200&width=2000", // Provide default cover image
  tags = [], // Provide default empty array for tags
}: BlogPostTemplateProps) {
  const isMobile = useIsMobile()
  const [isSubscribed, setIsSubscribed] = useState(false)

  // Ensure author has all required properties with defaults
  const safeAuthor = {
    name: author?.name || DEFAULT_AUTHOR.name,
    role: author?.role || DEFAULT_AUTHOR.role,
    avatar: author?.avatar || DEFAULT_AUTHOR.avatar,
  }

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubscribed(true)
    // In a real app, you would send this to your API
  }

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

      {/* Cover image */}
      <div className="relative h-[300px] md:h-[500px] w-full">
        {/* Use next/image with proper error handling */}
        <Image
          src={coverImage || "/placeholder.svg"}
          alt={title}
          fill
          className="object-cover"
          priority
          onError={(e) => {
            // Fallback to placeholder if image fails to load
            const imgElement = e.currentTarget as HTMLImageElement
            imgElement.src = "/placeholder.svg?height=1200&width=2000"
          }}
        />
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
                <div className="relative mr-2 h-8 w-8 overflow-hidden rounded-full">
                  <Image
                    src={safeAuthor.avatar || "/placeholder.svg"}
                    alt={safeAuthor.name}
                    fill
                    className="object-cover"
                    onError={(e) => {
                      // Fallback to placeholder if avatar fails to load
                      const imgElement = e.currentTarget as HTMLImageElement
                      imgElement.src = "/placeholder.svg?height=200&width=200"
                    }}
                  />
                </div>
                <div>
                  <span className="font-medium text-gray-900">{safeAuthor.name}</span>
                  {!isMobile && <span className="mx-1">•</span>}
                  <span className="block md:inline">{safeAuthor.role}</span>
                </div>
              </div>
              <div className="flex items-center">
                <Clock className="mr-1 h-4 w-4" />
                <span>{readTime}</span>
              </div>
              <div>{publishDate}</div>
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
              <div className="relative mr-4 h-16 w-16 overflow-hidden rounded-full">
                <Image
                  src={safeAuthor.avatar || "/placeholder.svg"}
                  alt={safeAuthor.name}
                  fill
                  className="object-cover"
                  onError={(e) => {
                    // Fallback to placeholder if avatar fails to load
                    const imgElement = e.currentTarget as HTMLImageElement
                    imgElement.src = "/placeholder.svg?height=200&width=200"
                  }}
                />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">About {safeAuthor.name}</h3>
                <p className="text-gray-600">{safeAuthor.role} at JiraVision</p>
              </div>
            </div>
            <p className="mt-4 text-gray-600">
              An experienced technology leader passionate about helping teams work more effectively with innovative
              tools and methodologies.
            </p>
          </div>

          {/* Newsletter signup */}
          <div className="mt-12 rounded-lg bg-blue-50 p-6">
            {!isSubscribed ? (
              <>
                <h3 className="mb-2 text-xl font-bold text-gray-900">Subscribe to our newsletter</h3>
                <p className="mb-4 text-gray-600">
                  Get the latest insights on Agile methodologies and team productivity delivered to your inbox.
                </p>
                <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-2">
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
              </>
            ) : (
              <div className="text-center">
                <h3 className="mb-2 text-xl font-bold text-gray-900">Thank you for subscribing!</h3>
                <p className="text-gray-600">You'll now receive our latest updates directly to your inbox.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
