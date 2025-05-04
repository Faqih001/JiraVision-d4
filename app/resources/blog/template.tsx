import type React from "react"
import { MainNavbar } from "@/components/main-navbar"
import { MainFooter } from "@/components/main-footer"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Calendar, Clock, Share2, Bookmark, ThumbsUp } from "lucide-react"
import Link from "next/link"

interface BlogPostTemplateProps {
  title: string
  excerpt: string
  content: React.ReactNode
  author: {
    name: string
    role: string
    avatar: string
  }
  publishDate: string
  readTime: string
  coverImage: string
  tags: string[]
}

export default function BlogPostTemplate({
  title,
  excerpt,
  content,
  author,
  publishDate,
  readTime,
  coverImage,
  tags,
}: BlogPostTemplateProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <MainNavbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container">
            <div className="max-w-4xl mx-auto">
              <Link
                href="/resources/blog"
                className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-6"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to all articles</span>
              </Link>

              <div className="flex flex-wrap gap-2 mb-6">
                {tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm text-primary"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <h1 className="text-4xl md:text-5xl font-bold mb-6">{title}</h1>

              <p className="text-xl text-muted-foreground mb-8">{excerpt}</p>

              <div className="flex items-center gap-6 mb-8">
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-full overflow-hidden">
                    <img
                      src={author.avatar || "/placeholder.svg"}
                      alt={author.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="font-medium">{author.name}</p>
                    <p className="text-sm text-muted-foreground">{author.role}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm">{publishDate}</span>
                </div>

                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">{readTime}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Cover Image */}
        <section className="py-8">
          <div className="container">
            <div className="max-w-4xl mx-auto">
              <div className="rounded-xl overflow-hidden h-[400px] md:h-[500px]">
                <img src={coverImage || "/placeholder.svg"} alt={title} className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        </section>

        {/* Content */}
        <section className="py-12">
          <div className="container">
            <div className="max-w-4xl mx-auto">
              <div className="flex gap-8">
                {/* Social Sharing Sidebar */}
                <div className="hidden md:flex flex-col gap-4 sticky top-24 h-fit">
                  <button className="h-10 w-10 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors">
                    <ThumbsUp className="h-5 w-5" />
                  </button>
                  <button className="h-10 w-10 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors">
                    <Share2 className="h-5 w-5" />
                  </button>
                  <button className="h-10 w-10 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors">
                    <Bookmark className="h-5 w-5" />
                  </button>
                </div>

                {/* Main Content */}
                <div className="flex-1">
                  <div className="prose prose-lg dark:prose-invert max-w-none">{content}</div>

                  {/* Tags */}
                  <div className="mt-12 pt-8 border-t">
                    <h3 className="text-lg font-semibold mb-4">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag, index) => (
                        <Link href={`/resources/blog/tag/${tag.toLowerCase()}`} key={index}>
                          <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-sm hover:bg-muted/80 transition-colors">
                            {tag}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>

                  {/* Author Bio */}
                  <div className="mt-12 pt-8 border-t">
                    <h3 className="text-lg font-semibold mb-4">About the Author</h3>
                    <div className="flex items-start gap-4">
                      <div className="h-16 w-16 rounded-full overflow-hidden">
                        <img
                          src={author.avatar || "/placeholder.svg"}
                          alt={author.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div>
                        <p className="font-medium text-lg">{author.name}</p>
                        <p className="text-muted-foreground mb-2">{author.role}</p>
                        <p>
                          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut
                          labore et dolore magna aliqua.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Mobile Social Sharing */}
                  <div className="flex md:hidden justify-center gap-4 mt-12 pt-8 border-t">
                    <button className="h-10 w-10 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors">
                      <ThumbsUp className="h-5 w-5" />
                    </button>
                    <button className="h-10 w-10 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors">
                      <Share2 className="h-5 w-5" />
                    </button>
                    <button className="h-10 w-10 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors">
                      <Bookmark className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Related Articles */}
        <section className="py-16 bg-muted/30">
          <div className="container">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold mb-8">Related Articles</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="bg-background rounded-xl overflow-hidden shadow-sm border hover:shadow-md transition-all duration-300"
                  >
                    <div className="h-48 overflow-hidden">
                      <img
                        src={`https://images.unsplash.com/photo-152${i}071820081-009f0129c71c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80`}
                        alt="Related Article"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-6">
                      <h3 className="font-bold mb-2">Related Article Title {i + 1}</h3>
                      <p className="text-muted-foreground text-sm mb-4">
                        A brief excerpt from the related article that gives the reader an idea of what it's about.
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">May {i + 1}, 2025</span>
                        <span className="text-sm text-muted-foreground">5 min read</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Newsletter */}
        <section className="py-16">
          <div className="container">
            <div className="max-w-4xl mx-auto bg-primary/5 rounded-xl p-8 md:p-12">
              <div className="text-center mb-8">
                <h2 className="text-2xl md:text-3xl font-bold mb-4">Subscribe to Our Newsletter</h2>
                <p className="text-muted-foreground">
                  Get the latest articles, updates, and tips delivered directly to your inbox.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 max-w-xl mx-auto">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 px-4 py-2 rounded-full border border-input bg-background"
                />
                <Button className="rounded-full">Subscribe</Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <MainFooter />
    </div>
  )
}
