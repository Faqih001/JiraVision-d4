import { MainNavbar } from "@/components/main-navbar"
import { MainFooter } from "@/components/main-footer"
import { Button } from "@/components/ui/button"
import {
  Calendar,
  Clock,
  ChevronRight,
  ChevronLeft,
  Share2,
  Bookmark,
  MessageSquare,
  Facebook,
  Twitter,
  Linkedin,
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"

// Mock data for blog posts - in a real app, this would come from a database
const blogPosts = [
  {
    slug: "ai-transforming-agile",
    title: "How AI is Transforming Agile Project Management",
    description:
      "Discover how artificial intelligence is revolutionizing traditional agile methodologies and helping teams deliver better results with less overhead.",
    image: "https://images.unsplash.com/photo-1531482615713-2afd69097998?q=80&w=1170&auto=format&fit=crop",
    date: "May 4, 2025",
    readTime: "5 min read",
    author: {
      name: "Sarah Johnson",
      role: "Product Director",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=1974&auto=format&fit=crop",
    },
    content: `
      <p>Artificial Intelligence (AI) is revolutionizing the way teams approach agile project management. By automating routine tasks, providing data-driven insights, and enhancing decision-making processes, AI tools are helping teams deliver better results with less overhead.</p>
      
      <h2>The Evolution of Agile Project Management</h2>
      
      <p>Traditional agile methodologies have served teams well for decades, but as projects become more complex and teams more distributed, new challenges have emerged. AI addresses these challenges by:</p>
      
      <ul>
        <li>Automating routine administrative tasks</li>
        <li>Providing predictive analytics for sprint planning</li>
        <li>Identifying potential bottlenecks before they impact delivery</li>
        <li>Enhancing communication across distributed teams</li>
      </ul>
      
      <h2>Key AI Applications in Agile</h2>
      
      <p>Several key applications of AI are transforming agile practices:</p>
      
      <h3>1. Intelligent Sprint Planning</h3>
      
      <p>AI algorithms can analyze historical sprint data to provide more accurate estimates for future work. By considering factors like team velocity, complexity of similar past tasks, and individual developer performance, AI can help teams create more realistic sprint plans.</p>
      
      <h3>2. Automated Stand-ups</h3>
      
      <p>AI-powered tools can collect status updates asynchronously, summarize them for the team, and flag potential blockers without requiring everyone to be present at the same time. This is especially valuable for distributed teams across different time zones.</p>
      
      <h3>3. Predictive Quality Assurance</h3>
      
      <p>Machine learning models can identify patterns in code that correlate with bugs or technical debt, allowing teams to address issues before they impact users. These models improve over time as they learn from each project's specific patterns.</p>
      
      <h2>Real-World Impact</h2>
      
      <p>Organizations implementing AI-enhanced agile practices are seeing significant improvements:</p>
      
      <ul>
        <li>40% reduction in time spent on administrative tasks</li>
        <li>30% improvement in estimation accuracy</li>
        <li>25% reduction in defects reaching production</li>
        <li>20% increase in overall team productivity</li>
      </ul>
      
      <h2>Getting Started with AI-Enhanced Agile</h2>
      
      <p>Teams looking to leverage AI in their agile processes should start with these steps:</p>
      
      <ol>
        <li>Identify repetitive, time-consuming tasks that could benefit from automation</li>
        <li>Ensure you have good historical data for AI tools to learn from</li>
        <li>Start small with one or two AI applications before scaling</li>
        <li>Continuously evaluate the impact and adjust your approach</li>
      </ol>
      
      <p>As AI technology continues to evolve, we can expect even more innovative applications in agile project management. Teams that embrace these tools now will be well-positioned to maintain a competitive edge in delivering high-quality software efficiently.</p>
    `,
    category: "AI Scrum Master",
    tags: ["Agile", "AI", "Project Management", "Productivity"],
  },
  {
    slug: "improve-team-wellbeing",
    title: "5 Ways to Improve Team Wellbeing in Remote Environments",
    description: "Practical strategies for maintaining team health and preventing burnout in distributed teams.",
    image: "https://images.unsplash.com/photo-1552581234-26160f608093?q=80&w=1170&auto=format&fit=crop",
    date: "April 28, 2025",
    readTime: "4 min read",
    author: {
      name: "Michael Chen",
      role: "Team Wellbeing Specialist",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=1170&auto=format&fit=crop",
    },
    category: "Team Wellbeing",
    tags: ["Remote Work", "Team Health", "Wellbeing", "Burnout Prevention"],
  },
  {
    slug: "gamification-science",
    title: "The Science Behind Effective Gamification in Project Management",
    description: "How gamification techniques can boost team motivation and productivity when implemented correctly.",
    image: "https://images.unsplash.com/photo-1559223607-a43c990c692c?q=80&w=1170&auto=format&fit=crop",
    date: "April 21, 2025",
    readTime: "6 min read",
    author: {
      name: "Jessica Taylor",
      role: "Gamification Expert",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=1170&auto=format&fit=crop",
    },
    category: "Gamification",
    tags: ["Gamification", "Motivation", "Team Engagement", "Psychology"],
  },
  {
    slug: "ethical-ai-project-management",
    title: "Ethical Considerations in AI-Powered Project Management",
    description: "Navigating the ethical challenges and opportunities of using AI in team and project governance.",
    image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=1170&auto=format&fit=crop",
    date: "April 15, 2025",
    readTime: "3 min read",
    author: {
      name: "David Wilson",
      role: "Ethics Researcher",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=1170&auto=format&fit=crop",
    },
    category: "Ethical AI",
    tags: ["Ethics", "AI", "Governance", "Best Practices"],
  },
]

// Function to get a blog post by slug
function getBlogPost(slug: string) {
  return blogPosts.find((post) => post.slug === slug)
}

// Function to get related blog posts (excluding the current one)
function getRelatedPosts(currentSlug: string, limit = 3) {
  return blogPosts.filter((post) => post.slug !== currentSlug).slice(0, limit)
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = getBlogPost(params.slug)
  const relatedPosts = getRelatedPosts(params.slug)

  // If post not found, this would typically redirect to a 404 page
  if (!post) {
    return (
      <div className="flex min-h-screen flex-col">
        <MainNavbar />
        <main className="flex-1 container py-20">
          <h1 className="text-3xl font-bold">Blog post not found</h1>
          <p className="mt-4">The blog post you're looking for doesn't exist.</p>
          <Button asChild className="mt-8">
            <Link href="/resources/blog">Back to Blog</Link>
          </Button>
        </main>
        <MainFooter />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <MainNavbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-16 bg-gradient-to-b from-slate-50 to-white">
          <div className="container">
            <div className="max-w-4xl mx-auto">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary mb-6">
                <Link href={`/resources/blog/category/${post.category.toLowerCase().replace(/\s+/g, "-")}`}>
                  {post.category}
                </Link>
              </div>

              <h1 className="text-4xl md:text-5xl font-bold mb-6">{post.title}</h1>

              <div className="flex items-center gap-4 mb-8">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full overflow-hidden relative">
                    <Image
                      src={post.author.avatar || "/placeholder.svg"}
                      alt={post.author.name}
                      className="object-cover"
                      fill
                      sizes="48px"
                    />
                  </div>
                  <div>
                    <p className="font-medium">{post.author.name}</p>
                    <p className="text-sm text-muted-foreground">{post.author.role}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{post.date}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{post.readTime}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Image */}
        <section className="pb-16">
          <div className="container">
            <div className="max-w-4xl mx-auto">
              <div className="h-[400px] md:h-[500px] rounded-xl overflow-hidden relative shadow-xl">
                <Image
                  src={post.image || "/placeholder.svg"}
                  alt={post.title}
                  className="object-cover"
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  priority
                />
              </div>
            </div>
          </div>
        </section>

        {/* Content Section */}
        <section className="py-16">
          <div className="container">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
              {/* Main Content */}
              <div className="lg:col-span-8">
                <div
                  className="prose prose-lg max-w-none"
                  dangerouslySetInnerHTML={{ __html: post.content || "<p>Content coming soon...</p>" }}
                ></div>

                {/* Tags */}
                <div className="mt-12">
                  <h3 className="text-lg font-semibold mb-4">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {post.tags?.map((tag, index) => (
                      <Link
                        key={index}
                        href={`/resources/blog/tag/${tag.toLowerCase().replace(/\s+/g, "-")}`}
                        className="bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded-full text-sm"
                      >
                        {tag}
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Share */}
                <div className="mt-12 border-t border-b py-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Share this article:</span>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                          <Facebook className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                          <Twitter className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                          <Linkedin className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                          <Share2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <Button variant="ghost" className="gap-2">
                      <Bookmark className="h-4 w-4" /> Save for later
                    </Button>
                  </div>
                </div>

                {/* Author Bio */}
                <div className="mt-12 bg-slate-50 rounded-xl p-6">
                  <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
                    <div className="h-24 w-24 rounded-full overflow-hidden relative">
                      <Image
                        src={post.author.avatar || "/placeholder.svg"}
                        alt={post.author.name}
                        className="object-cover"
                        fill
                        sizes="96px"
                      />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2">{post.author.name}</h3>
                      <p className="text-muted-foreground mb-4">{post.author.role}</p>
                      <p>
                        An experienced professional with expertise in {post.category}. Passionate about sharing
                        knowledge and helping teams improve their processes.
                      </p>
                      <div className="mt-4 flex gap-2">
                        <Button variant="outline" size="sm" className="rounded-full">
                          View Profile
                        </Button>
                        <Button variant="ghost" size="sm" className="rounded-full">
                          More Articles
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Comments Section */}
                <div className="mt-12">
                  <h3 className="text-2xl font-bold mb-6">Comments</h3>
                  <div className="bg-slate-50 rounded-xl p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <MessageSquare className="h-6 w-6 text-primary" />
                      <h4 className="text-lg font-semibold">Join the conversation</h4>
                    </div>
                    <p className="text-muted-foreground mb-4">
                      We'd love to hear your thoughts on this article. Sign in to leave a comment.
                    </p>
                    <Button>Sign In to Comment</Button>
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="lg:col-span-4">
                <div className="sticky top-8">
                  {/* Related Articles */}
                  <div className="bg-slate-50 rounded-xl p-6 mb-8">
                    <h3 className="text-lg font-semibold mb-4">Related Articles</h3>
                    <div className="space-y-6">
                      {relatedPosts.map((relatedPost, index) => (
                        <div key={index} className="flex gap-4">
                          <div className="h-16 w-16 rounded-md overflow-hidden relative shrink-0">
                            <Image
                              src={relatedPost.image || "/placeholder.svg"}
                              alt={relatedPost.title}
                              className="object-cover"
                              fill
                              sizes="64px"
                            />
                          </div>
                          <div>
                            <h4 className="font-medium line-clamp-2 mb-1">
                              <Link
                                href={`/resources/blog/${relatedPost.slug}`}
                                className="hover:text-primary transition-colors"
                              >
                                {relatedPost.title}
                              </Link>
                            </h4>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              <span>{relatedPost.date}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-6">
                      <Button variant="outline" asChild className="w-full">
                        <Link href="/resources/blog">View All Articles</Link>
                      </Button>
                    </div>
                  </div>

                  {/* Categories */}
                  <div className="bg-slate-50 rounded-xl p-6 mb-8">
                    <h3 className="text-lg font-semibold mb-4">Categories</h3>
                    <ul className="space-y-2">
                      {["AI Scrum Master", "Team Wellbeing", "Gamification", "Ethical Metrics"].map(
                        (category, index) => (
                          <li key={index}>
                            <Link
                              href={`/resources/blog/category/${category.toLowerCase().replace(/\s+/g, "-")}`}
                              className="flex items-center justify-between group"
                            >
                              <span className="group-hover:text-primary transition-colors">{category}</span>
                              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                            </Link>
                          </li>
                        ),
                      )}
                    </ul>
                  </div>

                  {/* Newsletter */}
                  <div className="bg-primary/10 rounded-xl p-6">
                    <h3 className="text-lg font-semibold mb-2">Subscribe to Our Newsletter</h3>
                    <p className="text-muted-foreground mb-4">
                      Get the latest articles and insights delivered to your inbox.
                    </p>
                    <div className="space-y-4">
                      <input
                        type="email"
                        placeholder="Your email address"
                        className="w-full px-4 py-2 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                      <Button className="w-full">Subscribe</Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Navigation */}
        <section className="py-16 bg-slate-50">
          <div className="container">
            <div className="max-w-4xl mx-auto">
              <div className="flex flex-col sm:flex-row justify-between gap-8">
                <Button variant="outline" asChild className="flex items-center gap-2">
                  <Link href="/resources/blog">
                    <ChevronLeft className="h-4 w-4" /> Back to Blog
                  </Link>
                </Button>
                <Button asChild>
                  <Link href={`/resources/blog/${relatedPosts[0]?.slug || ""}`} className="flex items-center gap-2">
                    Next Article <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <MainFooter />
    </div>
  )
}
