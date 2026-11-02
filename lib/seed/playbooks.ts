// lib/seed/playbooks.ts
import { db } from "@/lib/db";
import { playbooks, users } from "@/drizzle/schema";
import { eq, and } from "drizzle-orm";
import { type SeedResult } from "./types";
import { toDateOnly } from "./utils";

export async function seedPlaybooks(): Promise<SeedResult> {
  try {
    const existing = await db
      .select()
      .from(playbooks)
      .where(and(eq(playbooks.packKey, "it-technician"), eq(playbooks.discipline, "technician")))
      .limit(1);

    if (existing.length > 0) {
      console.log("Playbooks already seeded, skipping");
      return { module: "playbooks", status: "skipped", count: 0 };
    }

    console.log("Seeding playbooks...");

    // Get admin user ID
    const admin = await db.select().from(users).where(eq(users.email, "admin@jiravision.com")).limit(1);
    const authorId = admin[0]?.id;

    const playbookData = [
      {
        title: "Troubleshooting",
        summary: "Systematic approach to identifying and resolving technical issues",
        scopeKind: "support",
        method: [
          { phase: "Identify", description: "Understand exactly what is wrong", timeEstimate: 10 },
          { phase: "Reproduce", description: "Check whether it can be reproduced", timeEstimate: 15 },
          { phase: "Diagnose", description: "Identify the likely cause", timeEstimate: 20 },
          { phase: "Fix", description: "Apply the least disruptive appropriate solution", timeEstimate: 30 },
          { phase: "Test", description: "Confirm it works", timeEstimate: 10 },
          { phase: "Document", description: "Record problem, cause, solution and follow-up", timeEstimate: 15 },
        ],
        precautions: ["Document all steps taken", "Test in non-production environment first"],
        recommendations: ["Keep a knowledge base of common issues"],
        tags: ["support", "problem-solving"],
      },
      {
        title: "In-person support",
        summary: "Procedure for providing face-to-face technical assistance",
        scopeKind: "support",
        method: [
          { phase: "Receive", description: "Receive the request", timeEstimate: 5 },
          { phase: "Record", description: "Record it in the ticketing system where available", timeEstimate: 5 },
          { phase: "Identify", description: "Identify the affected user and device", timeEstimate: 5 },
          { phase: "Understand", description: "Understand symptoms and when it started", timeEstimate: 10 },
          { phase: "Check scope", description: "Check whether one user or several are affected", timeEstimate: 5 },
          { phase: "Troubleshoot", description: "Do basic troubleshooting", timeEstimate: 20 },
          { phase: "Resolve", description: "Resolve where possible", timeEstimate: 30 },
          { phase: "Test", description: "Test the solution with the user", timeEstimate: 10 },
          { phase: "Document", description: "Document the action", timeEstimate: 10 },
          { phase: "Close", description: "Close or escalate", timeEstimate: 5 },
        ],
        precautions: ["Be respectful of user's time", "Explain what you're doing"],
        recommendations: ["Follow up within 24 hours to ensure issue remains resolved"],
        tags: ["support", "face-to-face"],
      },
      {
        title: "Remote support",
        summary: "Procedure for providing technical assistance remotely",
        scopeKind: "support",
        method: [
          { phase: "Confirm identity", description: "Confirm the user's identity", timeEstimate: 5 },
          { phase: "Confirm device", description: "Confirm the device", timeEstimate: 5 },
          { phase: "Get description", description: "Get the description", timeEstimate: 10 },
          { phase: "Start session", description: "Start a session with an approved tool", timeEstimate: 5 },
          { phase: "Explain", description: "Explain what you will do before significant changes", timeEstimate: 5 },
          { phase: "Diagnose", description: "Diagnose", timeEstimate: 20 },
          { phase: "Fix", description: "Apply the fix", timeEstimate: 30 },
          { phase: "Test", description: "Test", timeEstimate: 10 },
          { phase: "Confirm", description: "Ask the user to confirm", timeEstimate: 5 },
        ],
        precautions: [
          "Never request a password unnecessarily",
          "Never save passwords in notes or tickets",
          "Do not install unauthorised software",
          "Do not disable security software without documented authorisation",
          "Do not access personal files unless needed",
          "End sessions when finished",
          "Never leave remote sessions unattended",
        ],
        recommendations: ["Record the session if possible for training purposes"],
        tags: ["support", "remote", "security"],
      },
      {
        title: "Backup procedure",
        summary: "Weekly and monthly backup verification and execution",
        scopeKind: "backup",
        method: [
          { phase: "Before: Confirm operational", description: "Confirm the backup system is operational", timeEstimate: 5 },
          { phase: "Before: Check storage", description: "Check available storage", timeEstimate: 5 },
          { phase: "Before: Review previous", description: "Review the previous backup status", timeEstimate: 5 },
          { phase: "Before: Check warnings", description: "Check unresolved warnings", timeEstimate: 5 },
          { phase: "Before: Confirm servers", description: "Confirm critical servers and services are available", timeEstimate: 5 },
          { phase: "Before: Confirm job", description: "Confirm the correct job is scheduled", timeEstimate: 5 },
          { phase: "During: Monitor progress", description: "Monitor progress", timeEstimate: 30 },
          { phase: "During: Monitor errors", description: "Monitor error messages", timeEstimate: 30 },
          { phase: "During: Monitor storage", description: "Monitor storage use", timeEstimate: 30 },
          { phase: "During: Monitor network", description: "Monitor network connectivity", timeEstimate: 30 },
          { phase: "After: Verify completion", description: "Verify it completed", timeEstimate: 5 },
          { phase: "After: Confirm no errors", description: "Confirm no critical errors", timeEstimate: 5 },
          { phase: "After: Confirm accessible", description: "Confirm files are accessible", timeEstimate: 10 },
          { phase: "After: Compare size", description: "Compare size with previous backups", timeEstimate: 5 },
          { phase: "After: Confirm destination", description: "Confirm the destination is available", timeEstimate: 5 },
          { phase: "After: Confirm retention", description: "Confirm retention is followed", timeEstimate: 5 },
          { phase: "After: Record result", description: "Record the result in the backup log", timeEstimate: 10 },
        ],
        precautions: ["Avoid unnecessary server changes during a critical backup"],
        recommendations: ["Test restore monthly"],
        tags: ["backup", "recurring", "critical"],
      },
      {
        title: "Backup test restoration",
        summary: "Monthly verification that backups can be restored",
        scopeKind: "backup",
        method: [
          { phase: "Select file", description: "Select a non-critical test file or approved dataset", timeEstimate: 10 },
          { phase: "Restore", description: "Restore it to a test location", timeEstimate: 30 },
          { phase: "Confirm opens", description: "Confirm it opens", timeEstimate: 10 },
          { phase: "Compare", description: "Compare with the original where appropriate", timeEstimate: 15 },
          { phase: "Record", description: "Record the result", timeEstimate: 10 },
        ],
        precautions: ["Report any failure immediately"],
        recommendations: ["Use different test files each month"],
        tags: ["backup", "testing", "recurring"],
      },
      {
        title: "New computer setup",
        summary: "Complete procedure for setting up a new workstation",
        scopeKind: "equipment",
        method: [
          { phase: "Record asset", description: "Record asset information", timeEstimate: 5 },
          { phase: "Install OS", description: "Install the approved OS if necessary", timeEstimate: 30 },
          { phase: "Apply updates", description: "Apply OS updates", timeEstimate: 30 },
          { phase: "Install drivers", description: "Install drivers", timeEstimate: 15 },
          { phase: "Install applications", description: "Install approved applications", timeEstimate: 30 },
          { phase: "Configure security", description: "Configure security/endpoint protection", timeEstimate: 15 },
          { phase: "Configure network", description: "Configure network access", timeEstimate: 10 },
          { phase: "Configure email", description: "Configure email/productivity apps", timeEstimate: 15 },
          { phase: "Apply settings", description: "Apply organisational settings", timeEstimate: 10 },
          { phase: "Test internet", description: "Test internet/network", timeEstimate: 5 },
          { phase: "Test applications", description: "Test required applications", timeEstimate: 15 },
          { phase: "Test printing", description: "Test printing where applicable", timeEstimate: 10 },
          { phase: "Assign device", description: "Assign the device in the asset register", timeEstimate: 5 },
          { phase: "Record handover", description: "Record the handover", timeEstimate: 10 },
        ],
        precautions: ["Verify all software licenses are valid"],
        recommendations: ["Create a checklist for consistent setup"],
        tags: ["equipment", "onboarding"],
      },
      {
        title: "Software installation",
        summary: "Procedure for installing approved software",
        scopeKind: "software",
        method: [
          { phase: "Confirm requirement", description: "Confirm the business requirement", timeEstimate: 5 },
          { phase: "Confirm approved", description: "Confirm the software is approved", timeEstimate: 5 },
          { phase: "Verify licensing", description: "Verify licensing", timeEstimate: 10 },
          { phase: "Obtain source", description: "Obtain it from a trusted source", timeEstimate: 15 },
          { phase: "Check requirements", description: "Check system requirements", timeEstimate: 5 },
          { phase: "Install", description: "Install", timeEstimate: 20 },
          { phase: "Apply updates", description: "Apply updates", timeEstimate: 10 },
          { phase: "Test", description: "Test", timeEstimate: 15 },
        ],
        precautions: ["Never install unapproved or pirated software"],
        recommendations: ["Document all installations in the software register"],
        tags: ["software", "installation"],
      },
      {
        title: "User offboarding",
        summary: "Procedure for securing assets when a user leaves",
        scopeKind: "offboarding",
        method: [
          { phase: "Collect equipment", description: "Collect company IT equipment", timeEstimate: 15 },
          { phase: "Record assets", description: "Record returned assets", timeEstimate: 10 },
          { phase: "Secure computer", description: "Secure the computer", timeEstimate: 10 },
          { phase: "Deactivate accounts", description: "Coordinate account deactivation with the appropriate administrator", timeEstimate: 15 },
          { phase: "Preserve data", description: "Preserve required business data per policy", timeEstimate: 20 },
          { phase: "Remove assignment", description: "Remove the device from the user's assignment", timeEstimate: 5 },
          { phase: "Prepare for reassignment", description: "Prepare it for reassignment or secure disposal", timeEstimate: 15 },
        ],
        precautions: ["Do not delete organisational data or disable accounts without authorisation"],
        recommendations: ["Follow HR offboarding checklist"],
        tags: ["offboarding", "security"],
      },
      {
        title: "Preventive maintenance",
        summary: "Weekly inspection and cleaning of IT equipment",
        scopeKind: "maintenance",
        method: [
          { phase: "Inspect cases", description: "Inspect and clean cases", timeEstimate: 10 },
          { phase: "Inspect vents", description: "Inspect vents and fans", timeEstimate: 10 },
          { phase: "Inspect peripherals", description: "Inspect keyboards, mice, monitors", timeEstimate: 10 },
          { phase: "Inspect printers", description: "Inspect printers", timeEstimate: 10 },
          { phase: "Inspect UPS", description: "Inspect UPS units", timeEstimate: 10 },
          { phase: "Check disk space", description: "Check disk space", timeEstimate: 5 },
          { phase: "Check CPU/RAM", description: "Check CPU, RAM usage", timeEstimate: 5 },
          { phase: "Check startup", description: "Check startup applications", timeEstimate: 5 },
          { phase: "Check processes", description: "Check background processes", timeEstimate: 5 },
          { phase: "Check updates", description: "Check OS updates", timeEstimate: 10 },
          { phase: "Check malware", description: "Check malware alerts", timeEstimate: 5 },
        ],
        precautions: [
          "Shut down equipment before cleaning where appropriate",
          "Disconnect power before opening equipment",
          "Avoid moisture",
          "Do not open equipment under warranty unless authorised",
          "Follow manufacturer instructions",
        ],
        recommendations: ["Keep a maintenance record per device"],
        tags: ["maintenance", "recurring", "weekly"],
      },
      {
        title: "Incident escalation",
        summary: "Procedure for escalating critical incidents",
        scopeKind: "incident",
        method: [
          { phase: "Assess severity", description: "Determine if incident meets escalation criteria", timeEstimate: 5 },
          { phase: "Document incident", description: "Record all required fields", timeEstimate: 15 },
          { phase: "Notify stakeholders", description: "Inform affected users and management", timeEstimate: 10 },
          { phase: "Contact vendor", description: "Engage vendor support if needed", timeEstimate: 15 },
          { phase: "Monitor resolution", description: "Track progress until resolved", timeEstimate: 60 },
          { phase: "Post-incident review", description: "Document lessons learned", timeEstimate: 30 },
        ],
        precautions: [
          "Escalate when: server unavailable, multiple departments affected, data may be lost, backup failed repeatedly, cybersecurity incident suspected, hardware needs specialist repair, network/core infrastructure problem, vendor intervention required, issue exceeds authorisation",
        ],
        recommendations: ["Every major escalation records: date/time, affected system, affected users, description, troubleshooting performed, error messages, screenshots/logs, business impact, person/vendor contacted, current status"],
        tags: ["incident", "escalation", "critical"],
      },
      {
        title: "Role handover",
        summary: "Procedure for transferring IT responsibilities",
        scopeKind: "handover",
        method: [
          { phase: "Transfer documentation", description: "Transfer access to infrastructure documentation", timeEstimate: 30 },
          { phase: "Transfer accounts", description: "Transfer accounts and systems through approved secure process", timeEstimate: 60 },
          { phase: "Transfer inventories", description: "Transfer equipment inventories", timeEstimate: 30 },
          { phase: "Review outstanding work", description: "Review outstanding work list", timeEstimate: 30 },
          { phase: "Demonstrate procedures", description: "Demonstrate critical procedures", timeEstimate: 60 },
        ],
        precautions: ["Never include credentials in documents"],
        recommendations: [
          "Confirm: responsibilities explained, server infrastructure documented, backup procedures/schedules/logs handed over, restore demonstrated, inventories/maintenance records current, open tickets reviewed, vendor contacts/maintenance schedules provided, critical procedures demonstrated, all equipment accounted for, escalation process understood",
        ],
        tags: ["handover", "documentation"],
      },
    ];

    for (const playbook of playbookData) {
      await db.insert(playbooks).values({
        packKey: "it-technician",
        discipline: "technician",
        title: playbook.title,
        summary: playbook.summary,
        scopeKind: playbook.scopeKind,
        method: playbook.method,
        steps: playbook.method,
        precautions: playbook.precautions,
        recommendations: playbook.recommendations,
        tags: playbook.tags,
        status: "published",
        version: 1,
        authorId: authorId,
        source: "manual",
        aiMarked: false,
        lastVerifiedAt: toDateOnly(new Date()),
        verifyIntervalDays: 180,
      });
    }

    console.log(`Seeded ${playbookData.length} playbooks`);
    return { module: "playbooks", status: "seeded", count: playbookData.length };
  } catch (error) {
    console.error("Failed to seed playbooks:", error);
    return {
      module: "playbooks",
      status: "failed",
      count: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
