// Site assistant — keyword matching tier 1, Gemini tier 2 (design §7)
// Anonymous, capped, uses pathname-based knowledge

import { geminiText, GeminiError } from "@/lib/ai/gemini"
import { getSiteKnowledge } from "./site-knowledge"
import { db } from "@/lib/db"
import { aiUsageDaily } from "@/drizzle/schema"
import { eq, and, sql } from "drizzle-orm"

// Tier 1: keyword matching (scripted responses)
const KEYWORD_RESPONSES: Record<string, string> = {
  pricing: "JiraVision has three plans: Starter ($9/user/month), Professional ($19/user/month), and Enterprise ($49/user/month). Annual billing saves 20%. All plans include a 14-day free trial with no credit card required.",
  cost: "JiraVision has three plans: Starter ($9/user/month), Professional ($19/user/month), and Enterprise ($49/user/month). Annual billing saves 20%. All plans include a 14-day free trial with no credit card required.",
  trial: "Every JiraVision plan includes a 14-day free trial. No credit card required to start. You can upgrade, downgrade, or cancel at any time.",
  free: "JiraVision offers a 14-day free trial on all plans. After the trial, plans start at $9/user/month for Starter.",
  features: "JiraVision includes task management, sprint planning, daily work logging, period reports to supervisors, AI-powered planning agent, Gantt charts, deliverable tracking, and career ladder with growth insights.",
  support: "JiraVision support is available via email at support@jiravision.com. Enterprise plans include priority support with 24-hour response time.",
  secure: "JiraVision uses industry-standard security: encrypted data in transit (TLS 1.3) and at rest (AES-256), SOC 2 Type II compliant infrastructure, regular security audits, and role-based access control.",
  security: "JiraVision uses industry-standard security: encrypted data in transit (TLS 1.3) and at rest (AES-256), SOC 2 Type II compliant infrastructure, regular security audits, and role-based access control.",
  integration: "JiraVision integrates with GitHub, GitLab, Bitbucket, Slack, Microsoft Teams, Google Calendar, and Outlook. Custom integrations available on Enterprise plan.",
  migrate: "Migrating to JiraVision is straightforward. We provide importers for Jira, Trello, Asana, Monday.com, and CSV. Most teams complete migration in under an hour.",
  migration: "Migrating to JiraVision is straightforward. We provide importers for Jira, Trello, Asana, Monday.com, and CSV. Most teams complete migration in under an hour.",
  demo: "You can try JiraVision with a 14-day free trial — no credit card required. Visit jiravision.com/signup to start. We also offer live demos for teams of 5+ users.",
  contact: "Contact JiraVision: email support@jiravision.com, or use the contact form on our website. For sales inquiries, email sales@jiravision.com.",
  api: "JiraVision provides a REST API for programmatic access. API documentation is available at jiravision.com/docs/api. API access included on Professional and Enterprise plans.",
  mobile: "JiraVision is fully responsive and works on mobile browsers. Native iOS and Android apps are on our roadmap for Q2 2027.",
  offline: "JiraVision requires an internet connection. Offline mode is not currently available but is on our long-term roadmap.",
  data: "Your data is stored in secure, SOC 2 Type II compliant data centers. You can export your data at any time in CSV, JSON, or PDF format. Data retention policies are configurable.",
  privacy: "JiraVision is GDPR compliant. We process data in the EU, provide data processing agreements, and support data subject rights (access, deletion, portability).",
  gdpr: "JiraVision is GDPR compliant. We process data in the EU, provide data processing agreements, and support data subject rights (access, deletion, portability).",
  soc: "JiraVision infrastructure is SOC 2 Type II compliant. We undergo annual audits and provide compliance reports to Enterprise customers upon request.",
  enterprise: "JiraVision Enterprise ($49/user/month) includes advanced features: custom workflows, SSO/SAML, audit logs, priority support, dedicated account manager, custom integrations, and on-premise deployment options.",
  team: "JiraVision is built for teams of 5-100 users. Starter plan supports 5-10 seats, Professional 10-50 seats, Enterprise 50-100+ seats. Volume discounts available for larger teams.",
  user: "JiraVision pricing is per user per month. Starter $9, Professional $19, Enterprise $49. Annual billing saves 20%. Minimum 5 seats on all plans.",
  seat: "JiraVision pricing is per seat (user) per month. Starter $9, Professional $19, Enterprise $49. Annual billing saves 20%. Minimum 5 seats on all plans.",
  billing: "JiraVision bills monthly or annually. Annual billing saves 20%. You can add or remove seats at any time — billing adjusts automatically. Cancel at period end.",
  payment: "JiraVision accepts credit cards (Visa, Mastercard, Amex) and bank transfers for annual Enterprise plans. All payments processed securely via Stripe.",
  invoice: "JiraVision provides invoices automatically after each payment. Enterprise customers can request net-30 terms. Download invoices from your account settings.",
  cancel: "You can cancel JiraVision at any time from your account settings. Your subscription remains active until the end of the billing period. No cancellation fees.",
  refund: "JiraVision offers a 30-day money-back guarantee on annual plans. Monthly plans are non-refundable but you can cancel anytime.",
  discount: "JiraVision offers 20% discount for annual billing. Nonprofits and educational institutions receive 30% discount — contact sales@jiravision.com.",
  nonprofit: "JiraVision offers 30% discount for registered nonprofits and educational institutions. Contact sales@jiravision.com with proof of status.",
  education: "JiraVision offers 30% discount for educational institutions and students. Contact sales@jiravision.com with proof of status.",
  student: "JiraVision offers 30% discount for students with valid .edu email. Contact sales@jiravision.com to apply.",
}

/**
 * Tier 1: Try keyword matching (scripted responses).
 * Returns null if no match found.
 */
function tryKeywordMatch(question: string): string | null {
  const lower = question.toLowerCase()
  
  for (const [keyword, response] of Object.entries(KEYWORD_RESPONSES)) {
    if (lower.includes(keyword)) {
      return response
    }
  }
  
  return null
}

/**
 * Check and increment daily usage cap.
 * Returns true if under cap, false if exceeded.
 */
async function checkAndIncrementUsage(scope: string, dailyCap: number): Promise<boolean> {
  const today = new Date().toISOString().split("T")[0]
  
  try {
    // Upsert: increment if exists, insert if not
    await db
      .insert(aiUsageDaily)
      .values({
        date: today,
        scope,
        calls: 1,
        inputTokens: 0,
        outputTokens: 0,
      })
      .onConflictDoUpdate({
        target: [aiUsageDaily.date, aiUsageDaily.scope],
        set: {
          calls: sql`${aiUsageDaily.calls} + 1`,
        },
      })
    
    // Check if we're now over the cap
    const [row] = await db
      .select({ calls: aiUsageDaily.calls })
      .from(aiUsageDaily)
      .where(and(eq(aiUsageDaily.date, today), eq(aiUsageDaily.scope, scope)))
      .limit(1)
    
    return row ? row.calls <= dailyCap : false
  } catch (error) {
    console.error("Usage tracking error:", error)
    // Fail open: if tracking fails, allow the request
    return true
  }
}

/**
 * Call site assistant.
 * Tier 1: keyword matching (free, instant).
 * Tier 2: Gemini with pathname-based knowledge (capped).
 */
export async function callSiteAssistant(
  question: string,
  pathname: string,
  options?: {
    dailyCap?: number
  }
): Promise<{ answer: string; source: "keyword" | "gemini" }> {
  const dailyCap = options?.dailyCap ?? 200

  // Tier 1: Try keyword matching first (free)
  const keywordMatch = tryKeywordMatch(question)
  if (keywordMatch) {
    return { answer: keywordMatch, source: "keyword" }
  }

  // Tier 2: Check daily cap before calling Gemini
  const underCap = await checkAndIncrementUsage("site", dailyCap)
  if (!underCap) {
    return {
      answer: "I've reached my daily limit for AI-powered responses. Please try again tomorrow, or check our FAQ and pricing pages for answers to common questions.",
      source: "keyword",
    }
  }

  // Get site knowledge for this pathname
  const siteKnowledge = getSiteKnowledge(pathname)

  // System prompt
  const systemPrompt = `You are a helpful assistant for the JiraVision website.
Answer questions about JiraVision's features, pricing, and policies based ONLY on the knowledge provided.
Be concise and friendly. If you don't have enough information, say so and suggest they check the FAQ or contact support.
Never invent pricing, features, or policies that aren't in the knowledge.

Knowledge:
${siteKnowledge}`

  // Call Gemini
  try {
    const { text } = await geminiText({
      system: systemPrompt,
      contents: [{ text: question }],
      temperature: 0.5,
      maxOutputTokens: 500,
      timeoutMs: 15_000,
    })

    return { answer: text, source: "gemini" }
  } catch (error) {
    if (error instanceof GeminiError) {
      // On any Gemini error, fall back to a generic scripted answer
      console.error("Site assistant Gemini error:", error.kind, error.message)
      return {
        answer: "I'm having trouble connecting to the AI service right now. Please check our FAQ page or contact support@jiravision.com for assistance.",
        source: "keyword",
      }
    }
    throw error
  }
}
