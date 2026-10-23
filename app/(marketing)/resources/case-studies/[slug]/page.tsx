"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, Calendar, Clock, Building, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

// Mock data - in a real app, this would come from a database
const caseStudyData = {
  "acme-corp-transformation": {
    title: "ACME Corp's Digital Transformation with JiraVision",
    description:
      "How ACME Corp increased productivity by 35% and reduced burnout with JiraVision's AI-powered project management",
    company: "ACME Corporation",
    industry: "Technology",
    employeeCount: "500-1000",
    location: "San Francisco, CA",
    logo: "/placeholder.svg?height=80&width=80",
    featuredImage: "/placeholder.svg?height=600&width=1200",
    publishDate: "June 15, 2023",
    readTime: "8 min read",
    tags: ["Digital Transformation", "AI Scrum Master", "Team Wellbeing"],
    results: [
      { metric: "Productivity Increase", value: "35%" },
      { metric: "Burnout Reduction", value: "42%" },
      { metric: "Sprint Completion Rate", value: "95%" },
      { metric: "Team Satisfaction", value: "4.8/5" },
    ],
    content: `
      ## The Challenge

      ACME Corporation, a leading technology company with over 500 employees, was facing significant challenges with their project management processes:

      - Inconsistent sprint planning leading to missed deadlines
      - High developer burnout rates due to uneven workload distribution
      - Lack of visibility into team wellbeing and capacity
      - Difficulty scaling Agile practices across multiple teams

      "We were struggling to maintain consistency in our Agile processes as we scaled," says Jennifer Chen, CTO at ACME Corp. "Our Scrum Masters were overwhelmed, and we didn't have good insights into team wellbeing or capacity."

      ## The Solution

      After evaluating several options, ACME Corp implemented JiraVision's AI-native project management platform with a focus on three key modules:

      ### 1. AI Scrum Master

      ACME deployed JiraVision's AI Scrum Master to automate and enhance their Scrum processes:

      - Automated sprint planning based on team capacity and historical velocity
      - AI-facilitated daily standups to identify blockers early
      - Data-driven retrospectives with actionable insights
      - Continuous sprint health monitoring with proactive alerts

      ### 2. Team Wellbeing Module

      To address burnout concerns, ACME implemented the Team Wellbeing features:

      - Sentiment analysis of team communications to detect stress and burnout risks
      - Workload monitoring to identify overloaded team members
      - Automated interventions to suggest task redistribution
      - Work-life balance tracking to prevent after-hours work

      ### 3. Ethical Metrics Dashboard

      ACME also deployed the Ethical Metrics Dashboard to ensure fair work distribution:

      - Real-time monitoring of workload balance across teams
      - DEI task distribution tracking to ensure equitable opportunities
      - Automated alerts for potential equity issues
      - Transparent reporting on team health metrics

      ## Implementation Process

      The implementation was completed in three phases over a 2-month period:

      1. **Discovery & Planning (2 weeks)**: JiraVision's team worked with ACME to understand their specific challenges and configure the platform accordingly.

      2. **Pilot Deployment (4 weeks)**: The platform was deployed to three teams for initial testing and feedback.

      3. **Full Rollout (2 weeks)**: After refining based on pilot feedback, JiraVision was deployed across all 12 development teams.

      "The implementation was surprisingly smooth," notes Michael Rodriguez, Head of Engineering. "The AI adapted quickly to our workflows, and the team at JiraVision provided excellent support throughout the process."

      ## Results

      After six months of using JiraVision, ACME Corp reported significant improvements:

      ### Productivity Gains

      - **35% increase** in overall team productivity
      - **95% sprint completion rate**, up from 72%
      - **28% reduction** in time spent in meetings

      ### Team Wellbeing Improvements

      - **42% reduction** in reported burnout cases
      - **67% decrease** in after-hours work
      - **Team satisfaction score** improved from 3.2/5 to 4.8/5

      ### Process Improvements

      - **89% reduction** in sprint planning time
      - **Improved estimation accuracy** by 40%
      - **Real-time visibility** into team capacity and wellbeing

      ## Key Success Factors

      ACME attributes their success with JiraVision to several factors:

      1. **Executive Sponsorship**: Strong support from leadership ensured adoption across the organization.

      2. **Phased Implementation**: Starting with a pilot allowed for refinement before full rollout.

      3. **Comprehensive Training**: All team members received training on how to work with the AI features.

      4. **Continuous Feedback**: Regular feedback sessions helped fine-tune the platform to ACME's specific needs.

      ## Looking Ahead

      Building on their success, ACME is now exploring additional JiraVision features:

      - Implementing the Gamification module to further boost engagement
      - Expanding the AI Scrum Master's capabilities to include product roadmap planning
      - Integrating with additional tools in their tech stack

      "JiraVision has transformed how we manage projects," concludes Jennifer Chen. "The combination of AI-driven project management and team wellbeing features has not only improved our productivity but also created a healthier work environment for our teams."
    `,
    testimonials: [
      {
        quote:
          "JiraVision has transformed how we manage projects. The combination of AI-driven project management and team wellbeing features has not only improved our productivity but also created a healthier work environment for our teams.",
        author: "Jennifer Chen",
        role: "CTO, ACME Corporation",
        avatar: "/placeholder.svg?height=80&width=80",
      },
      {
        quote:
          "The implementation was surprisingly smooth. The AI adapted quickly to our workflows, and the team at JiraVision provided excellent support throughout the process.",
        author: "Michael Rodriguez",
        role: "Head of Engineering, ACME Corporation",
        avatar: "/placeholder.svg?height=80&width=80",
      },
    ],
  },
  "globaltech-wellbeing": {
    title: "GlobalTech Improves Team Wellbeing with JiraVision",
    description:
      "How GlobalTech reduced burnout by 50% and improved team satisfaction using JiraVision's wellbeing features",
    company: "GlobalTech Inc.",
    industry: "Software Development",
    employeeCount: "1000-5000",
    location: "Multiple Global Offices",
    logo: "/placeholder.svg?height=80&width=80",
    featuredImage: "/placeholder.svg?height=600&width=1200",
    publishDate: "July 22, 2023",
    readTime: "10 min read",
    tags: ["Team Wellbeing", "Remote Work", "Global Teams"],
    results: [
      { metric: "Burnout Reduction", value: "50%" },
      { metric: "Team Satisfaction", value: "92%" },
      { metric: "Retention Improvement", value: "35%" },
      { metric: "Work-Life Balance Score", value: "4.7/5" },
    ],
    content: `
      ## The Challenge

      GlobalTech Inc., a multinational software development company with over 2,000 employees across 15 countries, was facing significant challenges with team wellbeing and burnout:

      - High burnout rates among distributed teams
      - Inconsistent work-life balance across different regions
      - Difficulty monitoring team wellbeing in a remote-first environment
      - Rising attrition rates attributed to stress and overwork

      "With teams spread across multiple time zones, we struggled to maintain healthy work-life boundaries," explains Sarah Johnson, Chief People Officer at GlobalTech. "Some team members were constantly working late to accommodate meetings, while others felt disconnected from their colleagues."

      ## The Solution

      GlobalTech implemented JiraVision with a primary focus on the Team Wellbeing module:

      ### 1. Sentiment Analysis

      - Implemented across communication channels (Slack, Teams, email)
      - Configured to respect privacy while detecting burnout signals
      - Set up automated alerts for concerning patterns
      - Established regular wellbeing check-ins

      ### 2. Workload Balancing

      - Deployed workload monitoring across all teams
      - Configured time zone-aware work hour tracking
      - Implemented automated task redistribution suggestions
      - Set up manager dashboards for team capacity visibility

      ### 3. Work-Life Boundary Enforcement

      - Established "no meeting" zones based on local time
      - Implemented after-hours communication monitoring
      - Created automated reminders for breaks and time off
      - Developed "right to disconnect" policies supported by the platform

      ## Implementation Process

      GlobalTech took a careful approach to implementation, focusing on privacy and cultural sensitivity:

      1. **Privacy-First Setup (3 weeks)**: Worked with legal and HR to establish privacy-respecting configurations.

      2. **Regional Pilots (8 weeks)**: Deployed to representative teams in each major region to test cultural fit.

      3. **Global Rollout (4 weeks)**: Phased implementation across all teams with localized training.

      4. **Continuous Refinement**: Ongoing adjustments based on feedback and regional needs.

      "We were particularly impressed with JiraVision's ability to adapt to different cultural contexts," notes Raj Patel, Global Head of Engineering. "The platform respects regional differences while maintaining consistent wellbeing standards."

      ## Results

      After one year of using JiraVision's Team Wellbeing features, GlobalTech reported remarkable improvements:

      ### Wellbeing Metrics

      - **50% reduction** in reported burnout cases
      - **92% team satisfaction** rate, up from 67%
      - **35% improvement** in employee retention
      - **Work-life balance score** improved to 4.7/5, up from 3.2/5

      ### Operational Improvements

      - **28% reduction** in after-hours work
      - **More equitable meeting distribution** across time zones
      - **Improved cross-region collaboration** with better scheduling
      - **Reduced context switching** through better work planning

      ### Business Impact

      - **Recruitment advantage** in competitive markets
      - **Estimated $3.2M savings** from reduced turnover
      - **Improved employer brand** and company reputation
      - **Higher quality deliverables** from more focused teams

      ## Key Success Factors

      GlobalTech identified several factors critical to their successful implementation:

      1. **Executive Commitment**: Leadership visibly embraced and modeled healthy work habits.

      2. **Cultural Adaptation**: The platform was configured to respect regional differences while maintaining standards.

      3. **Transparent Communication**: Clear messaging about privacy and the purpose of wellbeing monitoring.

      4. **Actionable Insights**: Focus on providing managers with specific actions, not just data.

      ## Looking Ahead

      Building on their success with the Team Wellbeing module, GlobalTech is now:

      - Expanding to JiraVision's Ethical Metrics Dashboard
      - Implementing the AI Scrum Master for distributed teams
      - Developing custom wellbeing metrics for different roles
      - Creating a wellbeing ambassador program supported by platform insights

      "JiraVision has been transformative for our global workforce," concludes Sarah Johnson. "We've moved from reactive burnout management to proactive wellbeing cultivation, and the results speak for themselves in our retention numbers and team satisfaction scores."
    `,
    testimonials: [
      {
        quote:
          "JiraVision has been transformative for our global workforce. We've moved from reactive burnout management to proactive wellbeing cultivation, and the results speak for themselves in our retention numbers and team satisfaction scores.",
        author: "Sarah Johnson",
        role: "Chief People Officer, GlobalTech Inc.",
        avatar: "/placeholder.svg?height=80&width=80",
      },
      {
        quote:
          "We were particularly impressed with JiraVision's ability to adapt to different cultural contexts. The platform respects regional differences while maintaining consistent wellbeing standards.",
        author: "Raj Patel",
        role: "Global Head of Engineering, GlobalTech Inc.",
        avatar: "/placeholder.svg?height=80&width=80",
      },
    ],
  },
  "startupx-scaling": {
    title: "StartupX Scales Agile with JiraVision's AI Scrum Master",
    description: "How a fast-growing startup maintained agility at scale using JiraVision's AI Scrum Master",
    company: "StartupX",
    industry: "FinTech",
    employeeCount: "50-200",
    location: "Austin, TX",
    logo: "/placeholder.svg?height=80&width=80",
    featuredImage: "/placeholder.svg?height=600&width=1200",
    publishDate: "August 10, 2023",
    readTime: "7 min read",
    tags: ["Startup", "Scaling Agile", "AI Scrum Master"],
    results: [
      { metric: "Team Growth", value: "300%" },
      { metric: "Sprint Velocity", value: "+45%" },
      { metric: "Release Frequency", value: "2x" },
      { metric: "Planning Time", value: "-75%" },
    ],
    content: `
      ## The Challenge

      StartupX, a rapidly growing FinTech company, was experiencing the classic growing pains of scaling Agile practices:

      - Growing from 20 to 80 engineers in just 18 months
      - Inconsistent Scrum practices across newly formed teams
      - Shortage of experienced Scrum Masters
      - Difficulty maintaining agility while scaling processes

      "We were victims of our own success," explains David Kim, Co-founder and CTO of StartupX. "Our rapid growth meant we were constantly forming new teams, but we didn't have enough experienced Scrum Masters to maintain consistent practices."

      ## The Solution

      StartupX implemented JiraVision with a focus on the AI Scrum Master module to address their scaling challenges:

      ### 1. AI-Driven Sprint Planning

      - Deployed automated sprint planning across all teams
      - Configured capacity planning based on historical data
      - Implemented consistent estimation practices
      - Set up cross-team dependency management

      ### 2. Standardized Scrum Practices

      - Established consistent Scrum ceremonies across teams
      - Created automated guidance for new team members
      - Implemented real-time coaching during meetings
      - Developed standardized reporting and metrics

      ### 3. Knowledge Sharing

      - Set up automated retrospective insights
      - Implemented cross-team learning recommendations
      - Created a central knowledge base of best practices
      - Developed AI-curated improvement suggestions

      ## Implementation Process

      StartupX took an iterative approach to implementation:

      1. **Pilot Team (2 weeks)**: Started with one mature team to establish baseline configurations.

      2. **New Team Onboarding (4 weeks)**: Expanded to newly formed teams that needed the most guidance.

      3. **Full Deployment (2 weeks)**: Rolled out to all remaining teams with customizations.

      4. **Continuous Learning**: Configured the AI to learn from the most successful teams and share practices.

      "The beauty of JiraVision's AI Scrum Master is that it learns from our best teams and helps standardize those practices across the organization," notes Emma Chen, VP of Engineering. "It's like having our best Scrum Master cloned across every team."

      ## Results

      After six months of using JiraVision, StartupX reported significant improvements in their ability to scale Agile practices:

      ### Scaling Metrics

      - Successfully **scaled from 8 to 24 teams**
      - Maintained consistent practices despite **300% team growth**
      - Achieved **45% higher sprint velocity** across teams
      - **Doubled release frequency** while maintaining quality

      ### Efficiency Improvements

      - Reduced sprint planning time by **75%**
      - Decreased time spent in Scrum ceremonies by **30%**
      - Improved estimation accuracy by **40%**
      - Reduced onboarding time for new teams by **60%**

      ### Business Impact

      - Maintained startup speed despite significant growth
      - Improved predictability for product roadmap
      - Enhanced visibility for executives and stakeholders
      - Reduced coordination overhead between teams

      ## Key Success Factors

      StartupX attributes their successful scaling to several factors:

      1. **Starting Small**: Piloting with one team allowed for configuration refinement.

      2. **Focus on Learning**: Configuring the AI to learn from successful teams created a positive feedback loop.

      3. **Human Partnership**: Using AI as an enhancer rather than replacement for human Scrum Masters.

      4. **Data-Driven Approach**: Leveraging historical data to improve future planning.

      ## Looking Ahead

      Building on their success with the AI Scrum Master, StartupX is now:

      - Implementing JiraVision's Team Wellbeing module to prevent burnout during rapid growth
      - Exploring the Gamification features to maintain engagement
      - Developing custom integrations with their financial planning tools
      - Creating an AI-assisted career development program

      "JiraVision's AI Scrum Master has been a game-changer for us," concludes David Kim. "It's allowed us to maintain our agility and culture of innovation while scaling at a pace that would have been impossible with traditional approaches."
    `,
    testimonials: [
      {
        quote:
          "JiraVision's AI Scrum Master has been a game-changer for us. It's allowed us to maintain our agility and culture of innovation while scaling at a pace that would have been impossible with traditional approaches.",
        author: "David Kim",
        role: "Co-founder and CTO, StartupX",
        avatar: "/placeholder.svg?height=80&width=80",
      },
      {
        quote:
          "The beauty of JiraVision's AI Scrum Master is that it learns from our best teams and helps standardize those practices across the organization. It's like having our best Scrum Master cloned across every team.",
        author: "Emma Chen",
        role: "VP of Engineering, StartupX",
        avatar: "/placeholder.svg?height=80&width=80",
      },
    ],
  },
}

// Mock related case studies
const relatedCaseStudies = {
  "acme-corp-transformation": [
    { slug: "globaltech-wellbeing", title: "GlobalTech Improves Team Wellbeing with JiraVision" },
    { slug: "startupx-scaling", title: "StartupX Scales Agile with JiraVision's AI Scrum Master" },
    { slug: "enterprise-ethical-metrics", title: "Enterprise Corp Implements Ethical Metrics Dashboard" },
  ],
  "globaltech-wellbeing": [
    { slug: "acme-corp-transformation", title: "ACME Corp's Digital Transformation with JiraVision" },
    { slug: "remote-team-success", title: "How RemoteFirst Improved Collaboration with JiraVision" },
    { slug: "healthcare-burnout-prevention", title: "HealthTech Prevents Burnout with Team Wellbeing Features" },
  ],
  "startupx-scaling": [
    { slug: "acme-corp-transformation", title: "ACME Corp's Digital Transformation with JiraVision" },
    { slug: "saas-growth-story", title: "SaaS Company Accelerates Growth with JiraVision" },
    { slug: "agile-at-scale", title: "Enterprise Agile Transformation with JiraVision" },
  ],
}

export default function CaseStudyPage({ params }: { params: { slug: string } }) {
  const [caseStudy, setCaseStudy] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // In a real app, this would be an API call
    const fetchCaseStudy = () => {
      setIsLoading(true)
      // Simulate API delay
      setTimeout(() => {
        setCaseStudy(caseStudyData[params.slug] || null)
        setIsLoading(false)
      }, 500)
    }

    fetchCaseStudy()
  }, [params.slug])

  if (isLoading) {
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

  if (!caseStudy) {
    return (
      <div className="container mx-auto py-12 px-4 text-center">
        <h1 className="text-3xl font-bold mb-4">Case Study Not Found</h1>
        <p className="mb-8">The case study you're looking for doesn't exist or has been moved.</p>
        <Button asChild>
          <Link href="/resources/case-studies">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Case Studies
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-12 px-4">
      <div className="mb-8">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/resources/case-studies">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Case Studies
          </Link>
        </Button>
        <h1 className="text-3xl md:text-4xl font-bold mb-4">{caseStudy.title}</h1>
        <p className="text-lg text-muted-foreground mb-6">{caseStudy.description}</p>
        <div className="flex flex-wrap gap-2 mb-6">
          {caseStudy.tags.map((tag: string) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-8">
          <div className="flex items-center">
            <Calendar className="mr-1 h-4 w-4" />
            {caseStudy.publishDate}
          </div>
          <div className="flex items-center">
            <Clock className="mr-1 h-4 w-4" />
            {caseStudy.readTime}
          </div>
        </div>
      </div>

      <div className="relative w-full h-[300px] md:h-[400px] lg:h-[500px] mb-12 rounded-lg overflow-hidden">
        <Image
          src={caseStudy.featuredImage || "/placeholder.svg"}
          alt={caseStudy.title}
          fill
          className="object-cover"
          priority
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="col-span-3">
          <div className="prose prose-lg max-w-none">
            <div dangerouslySetInnerHTML={{ __html: caseStudy.content }} />
          </div>

          <Separator className="my-12" />

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6">Testimonials</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {caseStudy.testimonials.map((testimonial: any, index: number) => (
                <Card key={index}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="relative h-12 w-12 rounded-full overflow-hidden">
                        <Image
                          src={testimonial.avatar || "/placeholder.svg"}
                          alt={testimonial.author}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div>
                        <p className="italic mb-4">"{testimonial.quote}"</p>
                        <p className="font-semibold">{testimonial.author}</p>
                        <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-6">Related Case Studies</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatedCaseStudies[params.slug as keyof typeof relatedCaseStudies]?.map((study: any) => (
                <Card key={study.slug} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <Link href={`/resources/case-studies/${study.slug}`} className="no-underline">
                      <h3 className="text-lg font-semibold mb-2 hover:text-primary transition-colors">{study.title}</h3>
                      <Button variant="link" className="p-0 h-auto">
                        Read Case Study
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        <div className="col-span-1">
          <div className="sticky top-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="relative h-12 w-12 rounded-lg overflow-hidden">
                    <Image
                      src={caseStudy.logo || "/placeholder.svg"}
                      alt={caseStudy.company}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold">{caseStudy.company}</h3>
                    <p className="text-sm text-muted-foreground">{caseStudy.industry}</p>
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{caseStudy.employeeCount} employees</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{caseStudy.location}</span>
                  </div>
                </div>

                <Separator className="my-4" />

                <h3 className="font-semibold mb-4">Key Results</h3>
                <div className="space-y-3">
                  {caseStudy.results.map((result: any, index: number) => (
                    <div key={index} className="flex justify-between">
                      <span className="text-sm">{result.metric}</span>
                      <span className="text-sm font-semibold">{result.value}</span>
                    </div>
                  ))}
                </div>

                <Separator className="my-6" />

                <Button className="w-full">
                  <Link href="/contact">Request a Demo</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
