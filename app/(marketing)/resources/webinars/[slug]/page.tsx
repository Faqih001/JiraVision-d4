"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, Calendar, Clock, Share2, ThumbsUp, MessageSquare, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Mock data - in a real app, this would come from a database
const webinarData = {
  "ai-scrum-master-introduction": {
    title: "Introduction to AI Scrum Master",
    description: "Learn how our AI Scrum Master can revolutionize your project management workflow",
    date: "May 15, 2023",
    duration: "45 minutes",
    speaker: {
      name: "Dr. Sarah Johnson",
      role: "Chief AI Officer",
      avatar: "/placeholder.svg?height=80&width=80",
    },
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    slides: "/placeholder.svg?height=600&width=800",
    attendees: 1245,
    likes: 328,
    comments: 47,
    tags: ["AI", "Project Management", "Scrum"],
    transcript: `
      Hello everyone, and welcome to our webinar on the AI Scrum Master feature of JiraVision.
      
      Today, we'll be exploring how artificial intelligence is transforming the role of the Scrum Master and how our platform leverages IBM Granite to create a truly autonomous project management experience.
      
      First, let's talk about the challenges of traditional Scrum. Many teams struggle with consistent sprint planning, accurate estimation, and effective retrospectives. These challenges often lead to missed deadlines, scope creep, and team burnout.
      
      Our AI Scrum Master addresses these challenges by providing real-time guidance, data-driven insights, and automated facilitation of Scrum events. The system learns from your team's historical performance to make increasingly accurate predictions and recommendations.
      
      Let's look at some key features:
      
      1. Autonomous sprint planning that balances team capacity with business priorities
      2. AI-facilitated daily standups that identify blockers before they become critical
      3. Real-time sprint health monitoring with proactive interventions
      4. Sentiment analysis of team communications to detect burnout risks
      
      In the next section, we'll dive into a live demonstration of these features...
    `,
  },
  "ethical-metrics-dashboard-demo": {
    title: "Ethical Metrics Dashboard Demo",
    description: "See how our Ethical Metrics Dashboard ensures fair workload distribution and DEI compliance",
    date: "June 3, 2023",
    duration: "60 minutes",
    speaker: {
      name: "Michael Chen",
      role: "Ethics in AI Lead",
      avatar: "/placeholder.svg?height=80&width=80",
    },
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    slides: "/placeholder.svg?height=600&width=800",
    attendees: 987,
    likes: 256,
    comments: 38,
    tags: ["Ethics", "DEI", "Dashboard"],
    transcript: `
      Welcome to our demonstration of the Ethical Metrics Dashboard, a groundbreaking feature of JiraVision that ensures your project management practices align with your organizational values.
      
      In today's workplace, ethical considerations are more important than ever. Teams need to ensure fair workload distribution, equitable task assignment, and inclusive practices. Our Ethical Metrics Dashboard provides real-time monitoring and actionable insights to help you achieve these goals.
      
      The dashboard tracks several key metrics:
      
      1. Workload balance across team members
      2. Distribution of high-visibility tasks across demographic groups
      3. Pay equity compliance for similar roles and responsibilities
      4. After-hours work monitoring to prevent burnout
      
      Let's take a closer look at how these metrics are calculated and visualized...
    `,
  },
  "gamification-for-developer-productivity": {
    title: "Gamification for Developer Productivity",
    description: "Discover how gamification elements can boost team engagement and productivity",
    date: "July 12, 2023",
    duration: "50 minutes",
    speaker: {
      name: "Alex Rivera",
      role: "UX Research Director",
      avatar: "/placeholder.svg?height=80&width=80",
    },
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    slides: "/placeholder.svg?height=600&width=800",
    attendees: 1532,
    likes: 412,
    comments: 73,
    tags: ["Gamification", "Productivity", "Engagement"],
    transcript: `
      Hello everyone! I'm excited to talk to you today about how JiraVision is using gamification to transform the developer experience and boost productivity.
      
      Gamification isn't just about adding points and badges to your workflow. It's about understanding human psychology and motivation, and designing experiences that tap into our natural desires for achievement, status, and mastery.
      
      In JiraVision, we've implemented a sophisticated gamification system that adapts to individual preferences and team dynamics. Our approach includes:
      
      1. Personalized skill trees that map to career development goals
      2. Team challenges that foster collaboration and friendly competition
      3. Meaningful rewards that translate to real-world benefits
      4. Progress visualization that celebrates both individual and team achievements
      
      Our research shows that teams using these features have seen a 27% increase in sprint completion rates and a 35% improvement in developer satisfaction scores.
      
      Now, let's look at how these features work in practice...
    `,
  },
}

// Mock related webinars
const relatedWebinars = [
  {
    slug: "team-wellbeing-analytics",
    title: "Team Wellbeing Analytics",
    description: "Learn how to monitor and improve your team's emotional health",
    date: "August 5, 2023",
    duration: "40 minutes",
    image: "/placeholder.svg?height=200&width=300",
  },
  {
    slug: "ai-powered-retrospectives",
    title: "AI-Powered Retrospectives",
    description: "Make your sprint retrospectives more effective with AI insights",
    date: "July 28, 2023",
    duration: "55 minutes",
    image: "/placeholder.svg?height=200&width=300",
  },
  {
    slug: "predictive-sprint-planning",
    title: "Predictive Sprint Planning",
    description: "Use AI to predict team velocity and optimize sprint planning",
    date: "June 22, 2023",
    duration: "45 minutes",
    image: "/placeholder.svg?height=200&width=300",
  },
]

export default function WebinarPage({ params }: { params: { slug: string } }) {
  const [webinar, setWebinar] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // In a real app, this would be an API call
    const fetchWebinar = () => {
      setIsLoading(true)
      // Simulate API delay
      setTimeout(() => {
        setWebinar(webinarData[params.slug] || null)
        setIsLoading(false)
      }, 500)
    }

    fetchWebinar()
  }, [params.slug])

  if (isLoading) {
    return (
      <div className="container mx-auto py-12 px-4">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-muted rounded w-1/2 mb-8"></div>
          <div className="h-96 bg-muted rounded mb-8"></div>
          <div className="h-4 bg-muted rounded w-full mb-2"></div>
          <div className="h-4 bg-muted rounded w-full mb-2"></div>
          <div className="h-4 bg-muted rounded w-5/6 mb-8"></div>
        </div>
      </div>
    )
  }

  if (!webinar) {
    return (
      <div className="container mx-auto py-12 px-4 text-center">
        <h1 className="text-3xl font-bold mb-4">Webinar Not Found</h1>
        <p className="text-muted-foreground mb-8">The webinar you're looking for doesn't exist or has been removed.</p>
        <Button asChild>
          <Link href="/resources/webinars">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Webinars
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-12 px-4">
      <div className="mb-8">
        <Button variant="outline" asChild>
          <Link href="/resources/webinars">
            <ArrowLeft className="mr-2 h-4 w-4" />
            All Webinars
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <h1 className="text-3xl font-bold mb-4">{webinar.title}</h1>
          <p className="text-xl text-muted-foreground mb-6">{webinar.description}</p>

          <div className="flex flex-wrap gap-2 mb-6">
            {webinar.tags.map((tag: string) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>

          <div className="flex items-center gap-4 mb-8">
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{webinar.date}</span>
            </div>
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{webinar.duration}</span>
            </div>
          </div>

          <div className="aspect-video bg-muted rounded-lg overflow-hidden mb-8">
            <iframe
              src={webinar.videoUrl}
              className="w-full h-full"
              title={webinar.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>

          <Tabs defaultValue="transcript">
            <TabsList className="mb-4">
              <TabsTrigger value="transcript">Transcript</TabsTrigger>
              <TabsTrigger value="slides">Slides</TabsTrigger>
              <TabsTrigger value="resources">Resources</TabsTrigger>
            </TabsList>
            <TabsContent value="transcript" className="space-y-4">
              <div className="whitespace-pre-line bg-muted/30 p-6 rounded-lg">{webinar.transcript}</div>
              <div className="flex justify-end">
                <Button variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  Download Transcript
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="slides">
              <div className="bg-muted/30 p-6 rounded-lg">
                <Image
                  src={webinar.slides || "/placeholder.svg"}
                  alt="Presentation Slides"
                  width={800}
                  height={600}
                  className="rounded-lg mx-auto"
                />
                <div className="flex justify-end mt-4">
                  <Button variant="outline" className="gap-2">
                    <Download className="h-4 w-4" />
                    Download Slides
                  </Button>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="resources">
              <div className="bg-muted/30 p-6 rounded-lg">
                <h3 className="text-lg font-medium mb-4">Additional Resources</h3>
                <ul className="space-y-3">
                  <li>
                    <Link href="#" className="text-primary hover:underline flex items-center gap-2">
                      <Download className="h-4 w-4" />
                      Webinar Handout (PDF)
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="text-primary hover:underline flex items-center gap-2">
                      <Download className="h-4 w-4" />
                      Code Samples (ZIP)
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="text-primary hover:underline flex items-center gap-2">
                      <Download className="h-4 w-4" />
                      Research Paper (PDF)
                    </Link>
                  </li>
                </ul>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex items-center justify-between mt-8 border-t border-b py-4">
            <div className="flex items-center gap-6">
              <Button variant="ghost" size="sm" className="gap-2">
                <ThumbsUp className="h-4 w-4" />
                <span>{webinar.likes}</span>
              </Button>
              <Button variant="ghost" size="sm" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                <span>{webinar.comments}</span>
              </Button>
            </div>
            <Button variant="ghost" size="sm" className="gap-2">
              <Share2 className="h-4 w-4" />
              Share
            </Button>
          </div>
        </div>

        <div>
          <div className="sticky top-24">
            <Card className="mb-8">
              <CardContent className="p-6">
                <h3 className="text-lg font-medium mb-4">About the Speaker</h3>
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={webinar.speaker.avatar || "/placeholder.svg"} alt={webinar.speaker.name} />
                    <AvatarFallback>{webinar.speaker.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{webinar.speaker.name}</div>
                    <div className="text-sm text-muted-foreground">{webinar.speaker.role}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="mb-8">
              <CardContent className="p-6">
                <h3 className="text-lg font-medium mb-4">Webinar Details</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date:</span>
                    <span>{webinar.date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duration:</span>
                    <span>{webinar.duration}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Attendees:</span>
                    <span>{webinar.attendees}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div>
              <h3 className="text-lg font-medium mb-4">Related Webinars</h3>
              <div className="space-y-4">
                {relatedWebinars.map((item) => (
                  <Card key={item.slug} className="overflow-hidden">
                    <Link href={`/resources/webinars/${item.slug}`}>
                      <Image
                        src={item.image || "/placeholder.svg"}
                        alt={item.title}
                        width={300}
                        height={200}
                        className="w-full h-40 object-cover"
                      />
                      <CardContent className="p-4">
                        <h4 className="font-medium line-clamp-2">{item.title}</h4>
                        <div className="flex items-center text-xs text-muted-foreground mt-2">
                          <Calendar className="h-3 w-3 mr-1" />
                          <span>{item.date}</span>
                        </div>
                      </CardContent>
                    </Link>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
