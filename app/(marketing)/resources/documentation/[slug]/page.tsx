"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, ChevronRight, Copy, Check, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Mock documentation data - in a real app, this would come from a database
const documentationData = {
  "getting-started": {
    title: "Getting Started with JiraVision",
    description: "Learn how to set up and start using JiraVision",
    content: `
      # Getting Started with JiraVision

      Welcome to JiraVision! This guide will help you get started with our AI-native project management platform.

      ## Prerequisites

      Before you begin, make sure you have:
      - A JiraVision account (sign up at jiravision.com if you don't have one)
      - Admin access to your organization's project management tools (for integration)
      - Basic understanding of Agile/Scrum methodologies

      ## Installation

      JiraVision is a cloud-based platform, so there's no installation required. Simply log in to your account at app.jiravision.com.

      ## Initial Setup

      ### 1. Connect Your Data Sources

      JiraVision works best when connected to your existing tools. Go to Settings > Integrations and connect:
      - Jira
      - GitHub/GitLab
      - Slack
      - Microsoft Teams
      - Google Workspace

      ### 2. Import Your Team

      Go to Team > Import and either:
      - Import directly from connected tools
      - Upload a CSV with team member details
      - Add team members manually

      ### 3. Configure Your First Project

      Go to Projects > New Project and:
      - Name your project
      - Select a template (Scrum, Kanban, or Custom)
      - Invite team members
      - Set up sprints (if using Scrum)

      ## Next Steps

      Once you've completed the initial setup, explore these key features:
      - AI Scrum Master: Set up automated sprint planning and retrospectives
      - Team Wellbeing: Configure sentiment analysis and workload monitoring
      - Ethical Metrics: Set up DEI monitoring and fair work distribution
      - Gamification: Customize skill trees and rewards for your team

      ## Getting Help

      If you need assistance:
      - Check our [Documentation](https://docs.jiravision.com)
      - Join our [Community Forum](https://community.jiravision.com)
      - Contact [Support](mailto:support@jiravision.com)
    `,
    sections: [
      { id: "prerequisites", title: "Prerequisites" },
      { id: "installation", title: "Installation" },
      { id: "initial-setup", title: "Initial Setup" },
      { id: "next-steps", title: "Next Steps" },
      { id: "getting-help", title: "Getting Help" },
    ],
  },
  "ai-scrum-master-guide": {
    title: "AI Scrum Master Guide",
    description: "Learn how to use the AI Scrum Master feature",
    content: `
      # AI Scrum Master Guide

      The AI Scrum Master is JiraVision's flagship feature that automates and enhances traditional Scrum processes.

      ## Overview

      The AI Scrum Master uses IBM Granite's advanced language and reasoning models to:
      - Facilitate Scrum events
      - Provide data-driven insights
      - Identify risks and blockers
      - Optimize team performance

      ## Key Features

      ### Autonomous Sprint Planning

      The AI Scrum Master can:
      - Analyze historical velocity data
      - Consider team capacity and availability
      - Prioritize backlog items based on business value
      - Recommend optimal sprint scope

      To use this feature:
      1. Go to Sprints > Planning
      2. Click "Generate AI Recommendation"
      3. Review and adjust the AI's suggestions
      4. Finalize the sprint plan

      ### AI-Facilitated Standups

      The AI Scrum Master can:
      - Collect status updates before the meeting
      - Identify common blockers
      - Suggest action items
      - Summarize key points

      To use this feature:
      1. Go to Sprints > Standups
      2. Schedule a standup meeting
      3. Enable "AI Facilitation"
      4. The AI will send reminders and collect updates

      ### Sprint Health Monitoring

      The AI Scrum Master continuously monitors:
      - Burndown/burnup trends
      - Task completion rates
      - Blocker resolution times
      - Team sentiment

      When issues are detected, the AI will:
      - Send alerts to the team
      - Suggest corrective actions
      - Provide data-driven insights

      ### Automated Retrospectives

      The AI Scrum Master can:
      - Analyze sprint data
      - Identify patterns and trends
      - Suggest discussion topics
      - Document action items

      To use this feature:
      1. Go to Sprints > Retrospectives
      2. Click "Generate AI Insights"
      3. Use the insights to guide your retrospective
      4. Document action items for the next sprint

      ## Best Practices

      - Start with a hybrid approach (AI + human Scrum Master)
      - Gradually increase AI autonomy as the team gets comfortable
      - Regularly review and provide feedback on AI recommendations
      - Use the AI's insights as a starting point, not the final word

      ## Advanced Configuration

      For advanced users, the AI Scrum Master can be customized:
      - Adjust the AI's personality and communication style
      - Configure risk tolerance thresholds
      - Integrate with custom data sources
      - Create team-specific heuristics
    `,
    sections: [
      { id: "overview", title: "Overview" },
      { id: "key-features", title: "Key Features" },
      { id: "autonomous-sprint-planning", title: "Autonomous Sprint Planning" },
      { id: "ai-facilitated-standups", title: "AI-Facilitated Standups" },
      { id: "sprint-health-monitoring", title: "Sprint Health Monitoring" },
      { id: "automated-retrospectives", title: "Automated Retrospectives" },
      { id: "best-practices", title: "Best Practices" },
      { id: "advanced-configuration", title: "Advanced Configuration" },
    ],
  },
  "team-wellbeing-setup": {
    title: "Team Wellbeing Setup",
    description: "Configure the Team Wellbeing features",
    content: `
      # Team Wellbeing Setup Guide

      JiraVision's Team Wellbeing features help you monitor and improve your team's emotional health and work-life balance.

      ## Overview

      The Team Wellbeing module uses sentiment analysis, workload monitoring, and communication pattern analysis to:
      - Detect burnout risks
      - Identify workload imbalances
      - Monitor team morale
      - Suggest interventions

      ## Initial Configuration

      ### Privacy Settings

      Before enabling Team Wellbeing features, configure privacy settings:
      1. Go to Settings > Team Wellbeing > Privacy
      2. Select which data sources to analyze
      3. Configure anonymization options
      4. Set access controls for wellbeing data

      ### Data Sources

      Connect relevant data sources:
      - Calendar (for meeting load analysis)
      - Communication tools (for sentiment analysis)
      - Task management (for workload analysis)
      - Time tracking (for work hours monitoring)

      ### Baseline Establishment

      The system needs 2-4 weeks to establish baseline metrics:
      1. Go to Team Wellbeing > Setup
      2. Click "Start Baseline Collection"
      3. Wait for the baseline period to complete
      4. Review and adjust thresholds

      ## Key Features

      ### Sentiment Analysis

      JiraVision analyzes team communications to detect:
      - Overall team mood
      - Individual sentiment trends
      - Communication tone and patterns

      To configure:
      1. Go to Team Wellbeing > Sentiment
      2. Select communication channels to analyze
      3. Set alert thresholds
      4. Configure response actions

      ### Workload Monitoring

      The system tracks:
      - Task assignments
      - Estimated vs. actual work hours
      - Meeting load
      - After-hours work

      To configure:
      1. Go to Team Wellbeing > Workload
      2. Set standard work hours
      3. Configure maximum workload thresholds
      4. Set up alerts and interventions

      ### Work-Life Balance

      Monitor and improve work-life balance:
      - Track after-hours communications
      - Monitor weekend work
      - Analyze vacation usage
      - Detect always-on behavior

      To configure:
      1. Go to Team Wellbeing > Work-Life
      2. Set working hours and time zones
      3. Configure vacation tracking
      4. Set up nudges for disconnecting

      ## Interventions

      JiraVision can automatically suggest or implement interventions:
      - Suggest redistribution of tasks
      - Recommend time off
      - Propose team building activities
      - Suggest one-on-one check-ins

      To configure:
      1. Go to Team Wellbeing > Interventions
      2. Select which interventions to enable
      3. Set thresholds for each intervention
      4. Configure approval workflows

      ## Reporting

      Generate reports to track team wellbeing over time:
      - Weekly wellbeing summaries
      - Monthly trend analysis
      - Quarterly wellbeing reviews
      - Custom reports

      To configure:
      1. Go to Team Wellbeing > Reports
      2. Select report types and frequency
      3. Configure recipients
      4. Set up automated insights
    `,
    sections: [
      { id: "overview", title: "Overview" },
      { id: "initial-configuration", title: "Initial Configuration" },
      { id: "privacy-settings", title: "Privacy Settings" },
      { id: "data-sources", title: "Data Sources" },
      { id: "baseline-establishment", title: "Baseline Establishment" },
      { id: "key-features", title: "Key Features" },
      { id: "sentiment-analysis", title: "Sentiment Analysis" },
      { id: "workload-monitoring", title: "Workload Monitoring" },
      { id: "work-life-balance", title: "Work-Life Balance" },
      { id: "interventions", title: "Interventions" },
      { id: "reporting", title: "Reporting" },
    ],
  },
}

// Mock related documentation
const relatedDocs = {
  "getting-started": [
    { slug: "ai-scrum-master-guide", title: "AI Scrum Master Guide" },
    { slug: "team-wellbeing-setup", title: "Team Wellbeing Setup" },
    { slug: "ethical-metrics-configuration", title: "Ethical Metrics Configuration" },
  ],
  "ai-scrum-master-guide": [
    { slug: "getting-started", title: "Getting Started with JiraVision" },
    { slug: "sprint-planning-automation", title: "Sprint Planning Automation" },
    { slug: "ai-facilitated-retrospectives", title: "AI-Facilitated Retrospectives" },
  ],
  "team-wellbeing-setup": [
    { slug: "getting-started", title: "Getting Started with JiraVision" },
    { slug: "sentiment-analysis-guide", title: "Sentiment Analysis Guide" },
    { slug: "workload-balancing", title: "Workload Balancing" },
  ],
}

export default function DocumentationPage({ params }: { params: { slug: string } }) {
  const [doc, setDoc] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    // In a real app, this would be an API call
    const fetchDocumentation = () => {
      setIsLoading(true)
      // Simulate API delay
      setTimeout(() => {
        setDoc(documentationData[params.slug] || null)
        setIsLoading(false)
      }, 500)
    }

    fetchDocumentation()
  }, [params.slug])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-12 px-4">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-muted rounded w-1/2 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-1">
              <div className="h-8 bg-muted rounded mb-4"></div>
              <div className="space-y-2">
                <div className="h-6 bg-muted rounded"></div>
                <div className="h-6 bg-muted rounded"></div>
                <div className="h-6 bg-muted rounded"></div>
              </div>
            </div>
            <div className="md:col-span-3">
              <div className="h-96 bg-muted rounded"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!doc) {
    return (
      <div className="container mx-auto py-12 px-4 text-center">
        <h1 className="text-3xl font-bold mb-4">Documentation Not Found</h1>
        <p className="text-muted-foreground mb-8">
          The documentation you're looking for doesn't exist or has been removed.
        </p>
        <Button asChild>
          <Link href="/resources/documentation">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Documentation
          </Link>
        </Button>
      </div>
    )
  }

  // Convert markdown to HTML (simplified version)
  const renderMarkdown = (markdown: string) => {
    return markdown.split("\n").map((line, index) => {
      if (line.startsWith("# ")) {
        return (
          <h1 key={index} className="text-3xl font-bold my-6">
            {line.substring(2)}
          </h1>
        )
      } else if (line.startsWith("## ")) {
        return (
          <h2
            key={index}
            id={line.substring(3).toLowerCase().replace(/\s+/g, "-")}
            className="text-2xl font-bold mt-8 mb-4"
          >
            {line.substring(3)}
          </h2>
        )
      } else if (line.startsWith("### ")) {
        return (
          <h3
            key={index}
            id={line.substring(4).toLowerCase().replace(/\s+/g, "-")}
            className="text-xl font-bold mt-6 mb-3"
          >
            {line.substring(4)}
          </h3>
        )
      } else if (line.startsWith("- ")) {
        return (
          <li key={index} className="ml-6 mb-2">
            {line.substring(2)}
          </li>
        )
      } else if (line.startsWith("1. ")) {
        return (
          <li key={index} className="ml-6 mb-2 list-decimal">
            {line.substring(3)}
          </li>
        )
      } else if (line.trim() === "") {
        return <br key={index} />
      } else {
        return (
          <p key={index} className="mb-4">
            {line}
          </p>
        )
      }
    })
  }

  const filteredContent = doc.content
    .split("\n")
    .filter((line: string) => searchQuery === "" || line.toLowerCase().includes(searchQuery.toLowerCase()))
    .join("\n")

  return (
    <div className="container mx-auto py-12 px-4">
      <div className="mb-8">
        <Button variant="outline" asChild>
          <Link href="/resources/documentation">
            <ArrowLeft className="mr-2 h-4 w-4" />
            All Documentation
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="md:col-span-1">
          <div className="sticky top-24">
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search in this document..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="mb-6">
              <h3 className="font-medium mb-3">On This Page</h3>
              <ul className="space-y-2 text-sm">
                {doc.sections.map((section: any) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className="text-muted-foreground hover:text-foreground flex items-center"
                    >
                      <ChevronRight className="h-3 w-3 mr-1" />
                      {section.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-medium mb-3">Related Documentation</h3>
              <ul className="space-y-2 text-sm">
                {relatedDocs[params.slug]?.map((related: any) => (
                  <li key={related.slug}>
                    <Link href={`/resources/documentation/${related.slug}`} className="text-primary hover:underline">
                      {related.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="md:col-span-3">
          <div className="bg-muted/30 p-6 rounded-lg mb-6 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">{doc.title}</h1>
              <p className="text-muted-foreground">{doc.description}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => copyToClipboard(doc.content)} title="Copy documentation">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          <Tabs defaultValue="content">
            <TabsList className="mb-4">
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="examples">Examples</TabsTrigger>
              <TabsTrigger value="api">API Reference</TabsTrigger>
            </TabsList>
            <TabsContent value="content" className="prose max-w-none dark:prose-invert">
              {renderMarkdown(filteredContent)}
            </TabsContent>
            <TabsContent value="examples">
              <div className="bg-muted/30 p-6 rounded-lg">
                <h2 className="text-xl font-bold mb-4">Examples</h2>
                <p className="text-muted-foreground mb-6">
                  Here are some examples of how to use the features described in this documentation.
                </p>
                <div className="space-y-6">
                  <div>
                    <h3 className="font-medium mb-2">Basic Example</h3>
                    <pre className="bg-muted p-4 rounded-md overflow-x-auto">
                      <code>
                        {`// Example code or configuration
const jiravision = new JiraVision();
await jiravision.initialize();
const project = await jiravision.createProject({
  name: "My First Project",
  template: "scrum"
});`}
                      </code>
                    </pre>
                  </div>
                  <div>
                    <h3 className="font-medium mb-2">Advanced Example</h3>
                    <pre className="bg-muted p-4 rounded-md overflow-x-auto">
                      <code>
                        {`// Advanced configuration
const jiravision = new JiraVision({
  aiLevel: "autonomous",
  integrations: ["jira", "github", "slack"],
  wellbeingFeatures: {
    sentimentAnalysis: true,
    workloadMonitoring: true
  }
});`}
                      </code>
                    </pre>
                  </div>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="api">
              <div className="bg-muted/30 p-6 rounded-lg">
                <h2 className="text-xl font-bold mb-4">API Reference</h2>
                <p className="text-muted-foreground mb-6">
                  Reference documentation for the API endpoints related to this feature.
                </p>
                <div className="space-y-6">
                  <div>
                    <h3 className="font-medium mb-2">GET /api/v1/projects</h3>
                    <p className="text-sm text-muted-foreground mb-2">Retrieves a list of all projects.</p>
                    <pre className="bg-muted p-4 rounded-md overflow-x-auto">
                      <code>
                        {`// Response example
{
  "projects": [
    {
      "id": "proj-123",
      "name": "My First Project",
      "template": "scrum",
      "createdAt": "2023-05-15T10:30:00Z"
    }
  ]
}`}
                      </code>
                    </pre>
                  </div>
                  <div>
                    <h3 className="font-medium mb-2">POST /api/v1/projects</h3>
                    <p className="text-sm text-muted-foreground mb-2">Creates a new project.</p>
                    <pre className="bg-muted p-4 rounded-md overflow-x-auto">
                      <code>
                        {`// Request body
{
  "name": "New Project",
  "template": "kanban",
  "teamMembers": ["user-123", "user-456"]
}

// Response
{
  "id": "proj-456",
  "name": "New Project",
  "template": "kanban",
  "createdAt": "2023-06-20T14:15:00Z"
}`}
                      </code>
                    </pre>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
