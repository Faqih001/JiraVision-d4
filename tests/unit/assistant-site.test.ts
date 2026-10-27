// Tests for lib/assistant/site.ts
import { describe, it, expect, beforeEach, vi } from "vitest"
import { callSiteAssistant } from "@/lib/assistant/site"

// Mock Gemini
vi.mock("@/lib/ai/gemini", () => ({
  geminiText: vi.fn(() =>
    Promise.resolve({
      text: "This is a Gemini response",
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
    })
  ),
  GeminiError: class GeminiError extends Error {
    kind: string
    constructor(kind: string, message: string) {
      super(message)
      this.kind = kind
    }
  },
}))

// Mock db
vi.mock("@/lib/db", () => ({
  db: {
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        onConflictDoUpdate: vi.fn(() => Promise.resolve()),
      })),
    })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([{ calls: 1 }])),
        })),
      })),
    })),
  },
}))

describe("callSiteAssistant", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("tier 1: keyword matching", () => {
    it("returns scripted answer for pricing question", async () => {
      const result = await callSiteAssistant("What is the pricing?", "/")
      expect(result.source).toBe("keyword")
      expect(result.answer).toContain("$9")
      expect(result.answer).toContain("$19")
      expect(result.answer).toContain("$49")
    })

    it("returns scripted answer for cost question", async () => {
      const result = await callSiteAssistant("How much does it cost?", "/")
      expect(result.source).toBe("keyword")
      expect(result.answer).toContain("$9")
    })

    it("returns scripted answer for trial question", async () => {
      const result = await callSiteAssistant("Is there a free trial?", "/")
      expect(result.source).toBe("keyword")
      expect(result.answer).toContain("14-day")
    })

    it("returns scripted answer for features question", async () => {
      const result = await callSiteAssistant("What are the features?", "/")
      expect(result.source).toBe("keyword")
      expect(result.answer).toContain("task management")
    })

    it("returns scripted answer for support question", async () => {
      const result = await callSiteAssistant("How do I contact support?", "/")
      expect(result.source).toBe("keyword")
      expect(result.answer).toContain("support@jiravision.com")
    })

    it("returns scripted answer for security question", async () => {
      const result = await callSiteAssistant("Is it secure?", "/")
      expect(result.source).toBe("keyword")
      expect(result.answer).toContain("encrypted")
    })

    it("returns scripted answer for integration question", async () => {
      const result = await callSiteAssistant("What integrations do you have?", "/")
      expect(result.source).toBe("keyword")
      expect(result.answer).toContain("GitHub")
    })

    it("returns scripted answer for migration question", async () => {
      const result = await callSiteAssistant("How do I migrate from Jira?", "/")
      expect(result.source).toBe("keyword")
      expect(result.answer).toContain("importers")
    })

    it("returns scripted answer for demo question", async () => {
      const result = await callSiteAssistant("Can I get a demo?", "/")
      expect(result.source).toBe("keyword")
      expect(result.answer).toContain("free trial")
    })

    it("returns scripted answer for contact question", async () => {
      const result = await callSiteAssistant("How do I contact you?", "/")
      expect(result.source).toBe("keyword")
      expect(result.answer).toContain("support@jiravision.com")
    })

    it("returns scripted answer for api question", async () => {
      const result = await callSiteAssistant("Do you have an API?", "/")
      expect(result.source).toBe("keyword")
      expect(result.answer).toContain("REST API")
    })

    it("returns scripted answer for mobile question", async () => {
      const result = await callSiteAssistant("Is there a mobile app?", "/")
      expect(result.source).toBe("keyword")
      expect(result.answer).toContain("responsive")
    })

    it("returns scripted answer for data question", async () => {
      const result = await callSiteAssistant("Where is my data stored?", "/")
      expect(result.source).toBe("keyword")
      expect(result.answer).toContain("SOC 2")
    })

    it("returns scripted answer for privacy question", async () => {
      const result = await callSiteAssistant("Are you GDPR compliant?", "/")
      expect(result.source).toBe("keyword")
      expect(result.answer).toContain("GDPR")
    })

    it("returns scripted answer for enterprise question", async () => {
      const result = await callSiteAssistant("Tell me about enterprise plan", "/")
      expect(result.source).toBe("keyword")
      expect(result.answer).toContain("Enterprise")
    })

    it("returns scripted answer for team question", async () => {
      const result = await callSiteAssistant("Is it good for teams?", "/")
      expect(result.source).toBe("keyword")
      expect(result.answer).toContain("teams")
    })

    it("returns scripted answer for billing question", async () => {
      const result = await callSiteAssistant("How does billing work?", "/")
      expect(result.source).toBe("keyword")
      expect(result.answer).toContain("monthly or annually")
    })

    it("returns scripted answer for cancel question", async () => {
      const result = await callSiteAssistant("Can I cancel anytime?", "/")
      expect(result.source).toBe("keyword")
      expect(result.answer).toContain("cancel")
    })

    it("returns scripted answer for refund question", async () => {
      const result = await callSiteAssistant("Do you offer refunds?", "/")
      expect(result.source).toBe("keyword")
      expect(result.answer).toContain("money-back")
    })

    it("returns scripted answer for discount question", async () => {
      const result = await callSiteAssistant("Are there any discounts?", "/")
      expect(result.source).toBe("keyword")
      expect(result.answer).toContain("20%")
    })

    it("returns scripted answer for nonprofit question", async () => {
      const result = await callSiteAssistant("Are there discounts for nonprofits?", "/")
      expect(result.source).toBe("keyword")
      expect(result.answer).toContain("Nonprofits")
    })

    it("returns scripted answer for education question", async () => {
      const result = await callSiteAssistant("Do you have student discounts?", "/")
      expect(result.source).toBe("keyword")
      expect(result.answer).toContain("educational")
    })

    it("matches keywords case-insensitively", async () => {
      const result = await callSiteAssistant("What is the PRICING?", "/")
      expect(result.source).toBe("keyword")
      expect(result.answer).toContain("$9")
    })

    it("matches keywords in longer questions", async () => {
      const result = await callSiteAssistant(
        "I'm interested in learning more about your pricing plans and what they include",
        "/"
      )
      expect(result.source).toBe("keyword")
      expect(result.answer).toContain("$9")
    })
  })

  describe("tier 2: Gemini fallback", () => {
    it("calls Gemini when no keyword match", async () => {
      const result = await callSiteAssistant(
        "Tell me about your company culture",
        "/about"
      )
      expect(result.source).toBe("gemini")
      expect(result.answer).toBe("This is a Gemini response")
    })

    it("passes pathname to Gemini context", async () => {
      const result = await callSiteAssistant("What makes you different?", "/pricing")
      expect(result).toBeDefined()
      expect(result.source).toBe("gemini")
    })

    it("respects daily cap option", async () => {
      const result = await callSiteAssistant("Random question", "/", {
        dailyCap: 100,
      })
      expect(result).toBeDefined()
    })
  })

  describe("error handling", () => {
    it("falls back to scripted answer on Gemini auth error", async () => {
      const { GeminiError } = await import("@/lib/ai/gemini")
      const { geminiText } = await import("@/lib/ai/gemini")
      vi.mocked(geminiText).mockRejectedValueOnce(
        new GeminiError("auth", "API key invalid")
      )

      const result = await callSiteAssistant("Random question", "/")
      expect(result.source).toBe("keyword")
      expect(result.answer).toContain("having trouble")
    })

    it("falls back to scripted answer on Gemini quota error", async () => {
      const { GeminiError } = await import("@/lib/ai/gemini")
      const { geminiText } = await import("@/lib/ai/gemini")
      vi.mocked(geminiText).mockRejectedValueOnce(
        new GeminiError("quota", "Quota exceeded")
      )

      const result = await callSiteAssistant("Random question", "/")
      expect(result.source).toBe("keyword")
      expect(result.answer).toContain("having trouble")
    })

    it("falls back to scripted answer on Gemini timeout", async () => {
      const { GeminiError } = await import("@/lib/ai/gemini")
      const { geminiText } = await import("@/lib/ai/gemini")
      vi.mocked(geminiText).mockRejectedValueOnce(
        new GeminiError("timeout", "Request timed out")
      )

      const result = await callSiteAssistant("Random question", "/")
      expect(result.source).toBe("keyword")
      expect(result.answer).toContain("having trouble")
    })
  })
})
