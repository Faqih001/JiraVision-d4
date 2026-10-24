import type { Metadata } from "next"
import { notFound } from "next/navigation"
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
    content: `
      <p>Remote work removed the commute and gave people back hours of their day. It also removed the small, constant signals that tell you how a colleague is actually doing — the sigh after a bad review, the quiet person who suddenly has nothing to say in stand-up. Wellbeing work in a distributed team is mostly the work of rebuilding those signals on purpose.</p>

      <h2>1. Make load visible before it becomes a problem</h2>

      <p>Burnout rarely announces itself. It shows up first as an uneven spread of work: one person carrying three critical tasks while two others have slack. Review assignment against capacity on a fixed cadence — weekly is usually enough — and treat "who is over-committed" as a planning question, not a personal one.</p>

      <ul>
        <li>Sort the roster by open work, not by name, so concentration is obvious at a glance.</li>
        <li>Flag anyone whose committed load exceeds what the sprint actually contains in working days.</li>
        <li>Move the work or move the date. Do not silently accept both.</li>
      </ul>

      <h2>2. Ask for a check-in, not a status report</h2>

      <p>A short, recurring wellbeing check-in gives people a low-cost way to say "this week is heavy" without having to raise it in a group call. Keep it to a few questions — energy, workload, blockers — and score it consistently so a downward trend is visible over time rather than only in hindsight.</p>

      <p>The scoring matters more than the questions. A single number per person per week, charted across the team, turns a vague sense that "things feel tense" into something a lead can act on in the next one-to-one.</p>

      <h2>3. Separate response time from working hours</h2>

      <p>Distributed teams span time zones, and the default that emerges without intervention is "always available." Replace it with an explicit expectation: which channel is urgent, what response time each channel carries, and what a person is never expected to answer outside their own hours. Write it down where onboarding picks it up.</p>

      <h2>4. Protect the boundaries between meetings</h2>

      <p>Back-to-back calls are the most common quiet tax on remote work. Two cheap fixes: default meetings to 25 or 50 minutes so there is a gap, and give every meeting an owner who is responsible for cutting it short when the agenda is done. Neither requires anyone's permission beyond the team's own.</p>

      <h2>5. Close the loop on what people tell you</h2>

      <p>Check-ins and retros only keep working if answers lead somewhere. When someone flags overload, the follow-up should be visible — a reassignment, a scope cut, a date moved. When nothing can change, say so and explain why. Surveys that never produce a response teach the team that answering is pointless, and the data dries up.</p>

      <h2>What to look at first</h2>

      <ol>
        <li>Trend, not snapshot: one low score is a bad day, four in a row is a signal.</li>
        <li>Distribution, not average: a healthy team mean can hide one person at the floor.</li>
        <li>Action items from the last retro that touched workload — were any of them completed?</li>
      </ol>

      <p>None of this requires a new policy or a budget. It requires treating wellbeing as an operational metric with the same standing as throughput: measured on a cadence, reviewed by the people who can change the work, and reported honestly when the number is bad.</p>
    `,
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
    content: `
      <p>Badges and leaderboards do not motivate people. They record motivation that already exists — or they replace it with something thinner. The difference between gamification that helps and gamification that quietly damages a team comes down to which psychological need the mechanic is feeding.</p>

      <h2>Start with self-determination theory</h2>

      <p>The most durable framework here is self-determination theory, which holds that sustained intrinsic motivation rests on three needs: competence (I am getting better at this), autonomy (I chose to do this), and relatedness (this matters to people I work with). A game mechanic that serves one of those three tends to land. A mechanic that serves none of them is just bookkeeping with confetti.</p>

      <ul>
        <li><strong>Competence</strong> — progress bars, streaks, level-ups tied to skills someone is deliberately building.</li>
        <li><strong>Autonomy</strong> — opt-in challenges, self-set targets, choices about which reward to pursue.</li>
        <li><strong>Relatedness</strong> — team goals, shared unlocks, recognition that names the contribution rather than the score.</li>
      </ul>

      <h2>Why points-for-points fails</h2>

      <p>Points awarded for activity — commits, comments, tickets touched — measure motion, not value. Teams respond by optimising the metric rather than the work, which is Goodhart's law playing out in a sprint: once a measure becomes a target, it stops being a good measure. The classic symptom is a burst of small, low-value ticket churn at the end of a scoring period.</p>

      <p>The fix is not to remove points but to anchor them to outcomes you already believe in: work completed within its estimate, review turnaround that unblocked someone else, a defect caught before release. If you cannot explain why an action earns points in one sentence, the rule is probably wrong.</p>

      <h2>Design the leaderboard so losing is survivable</h2>

      <p>A single all-time leaderboard is demotivating for anyone not in the top three, and it rewards the people who needed the least encouragement. Better patterns:</p>

      <ol>
        <li><strong>Reset cadence</strong> — weekly or per-sprint standings so a slow start is not a permanent position.</li>
        <li><strong>Cohorts</strong> — compare people doing comparable work; a designer and an on-call engineer should not share one ranking.</li>
        <li><strong>Personal bests</strong> — show progress against the person's own history alongside any team ranking.</li>
        <li><strong>Team totals</strong> — where competition would damage collaboration, score the group instead of the individual.</li>
      </ol>

      <h2>Recognition beats reward</h2>

      <p>Research on motivation consistently finds that extrinsic rewards can crowd out intrinsic interest in work people already found meaningful — the overjustification effect. In practice this means a public, specific acknowledgement of what someone did and why it mattered usually outperforms a token of equivalent cash value. Kudos that name the behaviour also teach the rest of the team what good looks like.</p>

      <h2>Make the rules inspectable</h2>

      <p>Trust in a gamified system collapses the moment someone suspects the scoring is arbitrary or hidden. Publish the point rules, show the history of a person's own awards, and let the team propose changes. A mechanic people helped design is a mechanic people accept when they lose.</p>

      <h2>Measure whether it is working</h2>

      <p>Gamification needs the same treatment as any other intervention: a baseline and a review. Watch for movement in the things you actually care about — cycle time, review latency, sprint completion, participation in retros — and watch the counter-signals too: ticket churn, gaming of estimates, and whether the same two people collect every award. If engagement with the game rises while delivery does not, the game is the product and your sprint is the raw material.</p>

      <p>Used with that discipline, gamification is not a trick. It is a way of making progress visible and effort acknowledged, which most teams already want and rarely get.</p>
    `,
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
    content: `
      <p>AI in project management is rarely a robot making decisions. It is a recommendation, a risk score, a suggested owner, a summary of a thread nobody read. That framing matters: the ethical question is almost never "is the model correct" but "who is accountable when a person acts on it."</p>

      <h2>Explainability is a feature, not a nicety</h2>

      <p>If a tool flags a task as at-risk, the person receiving that flag needs to know which inputs produced it. Without that, they either ignore the system entirely or defer to it uncritically — both of which are worse than not having it. Prefer models and prompts whose reasoning can be surfaced in plain language alongside the recommendation, and store the reasoning with the record so it can be audited later.</p>

      <h2>Watch for proxy discrimination</h2>

      <p>Historical project data encodes past decisions, including unfair ones. A model trained on who was assigned stretch work, whose estimates were trusted, or who got flagged as a bottleneck can reproduce those patterns while looking purely statistical. Two guards help:</p>

      <ul>
        <li>Review any per-person score for patterns across teams, locations, tenure or role before it influences a decision.</li>
        <li>Keep human judgement in the loop for anything that affects a person's work allocation, appraisal or reputation. Automate reminders, not consequences.</li>
      </ul>

      <h2>Be honest about the data</h2>

      <p>Tell people what is collected, what is used to train or tune models, and what is retained. Wellbeing and sentiment signals deserve the strictest treatment: they are the most useful inputs an AI system can have and the easiest to misuse. Aggregate by default, restrict access to individuals, and never let a check-in score become a performance input without the team knowing.</p>

      <h2>Design the override path first</h2>

      <p>Every automated recommendation needs a visible way to disagree, a record that the disagreement happened, and no penalty for using it. If dismissing a suggestion is harder than accepting it, the system is not assisting — it is deciding.</p>

      <h2>A practical checklist</h2>

      <ol>
        <li>Can a person see why this recommendation was made?</li>
        <li>Can they override it, and is the override recorded?</li>
        <li>Who is accountable for the outcome — the tool, the operator, or the manager who approved it?</li>
        <li>What personal data went in, and who can still read it?</li>
        <li>When was the last time anyone checked the outputs for unfair patterns?</li>
      </ol>

      <p>Answering those five questions before rollout turns most ethical risk into an ordinary product decision. Leaving them unanswered is what turns a useful assistant into a liability.</p>
    `,
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = getBlogPost(slug)
  if (!post) return { title: "Blog post not found" }
  return {
    title: post.title,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.date,
      images: [{ url: post.image }],
    },
  }
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = getBlogPost(slug)
  const relatedPosts = getRelatedPosts(slug)

  if (!post) notFound()

  return (
    <div className="flex min-h-screen flex-col">

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
                  dangerouslySetInnerHTML={{ __html: post.content }}
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

    </div>
  )
}
