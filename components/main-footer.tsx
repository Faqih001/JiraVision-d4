"use client"

import Link from "next/link"
import Image from "next/image"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowRight, Twitter, Linkedin, Github, Facebook, Instagram } from "lucide-react"

export function MainFooter() {
  return (
    <footer className="bg-background border-t">
      <div className="container px-4 md:px-6 py-12 md:py-16">
        {/* Top Section */}
        
        {/* Mobile: Company Info + Accordion */}
        <div className="md:hidden mb-8">
          {/* Logo and description for mobile */}
          <div className="flex items-center gap-2 font-bold text-xl mb-4">
            <div className="relative h-8 w-8">
              <Image 
                src="/jiravision_logo.png" 
                alt="JiraVision"
                fill
                sizes="32px"
                className="object-contain"
              />
            </div>
            <span>JiraVision</span>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            Transforming project management with AI-powered tools that prioritize team wellbeing.
          </p>
          
          {/* Social Icons for mobile */}
          <div className="flex gap-3 mb-6">
            <a
              href="#"
              className="h-9 w-9 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
            >
              <Twitter className="h-4 w-4 text-muted-foreground" />
              <span className="sr-only">Twitter</span>
            </a>
            <a
              href="#"
              className="h-9 w-9 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
            >
              <Linkedin className="h-4 w-4 text-muted-foreground" />
              <span className="sr-only">LinkedIn</span>
            </a>
            <a
              href="#"
              className="h-9 w-9 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
            >
              <Github className="h-4 w-4 text-muted-foreground" />
              <span className="sr-only">GitHub</span>
            </a>
            <a
              href="#"
              className="h-9 w-9 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
            >
              <Facebook className="h-4 w-4 text-muted-foreground" />
              <span className="sr-only">Facebook</span>
            </a>
            <a
              href="#"
              className="h-9 w-9 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
            >
              <Instagram className="h-4 w-4 text-muted-foreground" />
              <span className="sr-only">Instagram</span>
            </a>
          </div>

          {/* Accordion sections */}
          <FooterAccordion title="Products">
            <ul className="space-y-3 px-1">
              <li>
                <Link href="/products/ai-scrum-master" className="text-muted-foreground hover:text-foreground transition-colors">AI Scrum Master</Link>
              </li>
              <li>
                <Link href="/products/team-wellbeing" className="text-muted-foreground hover:text-foreground transition-colors">Team Wellbeing</Link>
              </li>
              <li>
                <Link href="/products/gamification" className="text-muted-foreground hover:text-foreground transition-colors">Gamification</Link>
              </li>
              <li>
                <Link href="/products/ethical-metrics" className="text-muted-foreground hover:text-foreground transition-colors">Ethical Metrics</Link>
              </li>
              <li>
                <Link href="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
              </li>
            </ul>
          </FooterAccordion>

          <FooterAccordion title="Company">
            <ul className="space-y-3 px-1">
              <li><Link href="/about" className="text-muted-foreground hover:text-foreground transition-colors">About Us</Link></li>
              <li><Link href="/careers" className="text-muted-foreground hover:text-foreground transition-colors">Careers</Link></li>
              <li><Link href="/contact" className="text-muted-foreground hover:text-foreground transition-colors">Contact</Link></li>
              <li><Link href="/faq" className="text-muted-foreground hover:text-foreground transition-colors">FAQ</Link></li>
              <li><Link href="/legal-notice" className="text-muted-foreground hover:text-foreground transition-colors">Legal Notice</Link></li>
            </ul>
          </FooterAccordion>

          <FooterAccordion title="Subscribe">
            <div className="px-1">
              <p className="text-sm text-muted-foreground mb-3">Stay updated with the latest features, tips, and insights from our team.</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input type="email" placeholder="Enter your email" className="rounded-full flex-1" />
                <Button size="icon" className="rounded-full h-10 w-10 self-start sm:self-auto">
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </FooterAccordion>
        </div>

        {/* Tablet & Desktop: grid layout */}
        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-12 mb-12">
          {/* Company Info */}
          <div className="md:col-span-2 lg:col-span-5">
            <div className="flex items-center gap-2 font-bold text-xl mb-6">
              <div className="relative h-8 w-8">
                <Image 
                  src="/jiravision_logo.png" 
                  alt="JiraVision"
                  fill
                  sizes="32px"
                  className="object-contain"
                />
              </div>
              <span>JiraVision</span>
            </div>
            <p className="text-sm text-muted-foreground mb-6 max-w-md">
              Transforming project management with AI-powered tools that prioritize team wellbeing, ethical metrics, and
              human-centered collaboration.
            </p>
            <div className="flex gap-3">
              <a
                href="#"
                className="h-10 w-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
              >
                <Twitter className="h-5 w-5 text-muted-foreground" />
                <span className="sr-only">Twitter</span>
              </a>
              <a
                href="#"
                className="h-10 w-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
              >
                <Linkedin className="h-5 w-5 text-muted-foreground" />
                <span className="sr-only">LinkedIn</span>
              </a>
              <a
                href="#"
                className="h-10 w-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
              >
                <Github className="h-5 w-5 text-muted-foreground" />
                <span className="sr-only">GitHub</span>
              </a>
              <a
                href="#"
                className="h-10 w-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
              >
                <Facebook className="h-5 w-5 text-muted-foreground" />
                <span className="sr-only">Facebook</span>
              </a>
              <a
                href="#"
                className="h-10 w-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
              >
                <Instagram className="h-5 w-5 text-muted-foreground" />
                <span className="sr-only">Instagram</span>
              </a>
            </div>
          </div>

          {/* Navigation Links - Products */}
          <div className="md:col-span-1 lg:col-span-2">
            <h3 className="font-semibold mb-4 text-sm md:text-base">Products</h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/products/ai-scrum-master"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  AI Scrum Master
                </Link>
              </li>
              <li>
                <Link
                  href="/products/team-wellbeing"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Team Wellbeing
                </Link>
              </li>
              <li>
                <Link
                  href="/products/gamification"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Gamification
                </Link>
              </li>
              <li>
                <Link
                  href="/products/ethical-metrics"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Ethical Metrics
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Pricing
                </Link>
              </li>
            </ul>
          </div>

          {/* Company Links */}
          <div className="md:col-span-1 lg:col-span-2">
            <h3 className="font-semibold mb-4 text-sm md:text-base">Company</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/careers" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Careers
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/legal-notice" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Legal Notice
                </Link>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div className="md:col-span-2 lg:col-span-3">
            <h3 className="font-semibold mb-4 text-sm md:text-base">Subscribe to our newsletter</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Stay updated with the latest features, tips, and insights from our team.
            </p>
            <div className="flex gap-2">
              <Input type="email" placeholder="Enter your email" className="rounded-full text-sm" />
              <Button size="icon" className="rounded-full h-10 w-10 flex-shrink-0">
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-muted-foreground/10 my-8"></div>

        {/* Bottom Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6">
          <div className="flex flex-wrap gap-4 md:gap-6 text-xs md:text-sm text-muted-foreground">
            <Link href="/terms" className="hover:text-foreground transition-colors">
              Terms of Service
            </Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <Link href="/cookies" className="hover:text-foreground transition-colors">
              Cookie Policy
            </Link>
            <Link href="/accessibility" className="hover:text-foreground transition-colors">
              Accessibility
            </Link>
          </div>
          <div className="text-xs md:text-sm text-muted-foreground">
            © {new Date().getFullYear()} JiraVision. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  )
}

function FooterAccordion({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border-b border-muted/10 py-3">
      <button
        className="flex w-full items-center justify-between text-sm font-medium"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span>{title}</span>
        <span className="text-muted-foreground">{open ? "−" : "+"}</span>
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  )
}
