import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowRight, Twitter, Linkedin, Github, Facebook, Instagram } from "lucide-react"

export function MainFooter() {
  return (
    <footer className="bg-background border-t">
      <div className="container py-16">
        {/* Top Section */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 mb-12">
          {/* Company Info */}
          <div className="md:col-span-5">
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
            <p className="text-muted-foreground mb-6 max-w-md">
              Transforming project management with AI-powered tools that prioritize team wellbeing, ethical metrics, and
              human-centered collaboration.
            </p>
            <div className="flex gap-4">
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

          {/* Navigation Links */}
          <div className="md:col-span-2">
            <h3 className="font-semibold mb-4">Products</h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/products/ai-scrum-master"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  AI Scrum Master
                </Link>
              </li>
              <li>
                <Link
                  href="/products/team-wellbeing"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Team Wellbeing
                </Link>
              </li>
              <li>
                <Link
                  href="/products/gamification"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Gamification
                </Link>
              </li>
              <li>
                <Link
                  href="/products/ethical-metrics"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Ethical Metrics
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">
                  Pricing
                </Link>
              </li>
            </ul>
          </div>

          <div className="md:col-span-2">
            <h3 className="font-semibold mb-4">Company</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/about" className="text-muted-foreground hover:text-foreground transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/careers" className="text-muted-foreground hover:text-foreground transition-colors">
                  Careers
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-muted-foreground hover:text-foreground transition-colors">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-muted-foreground hover:text-foreground transition-colors">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/legal-notice" className="text-muted-foreground hover:text-foreground transition-colors">
                  Legal Notice
                </Link>
              </li>
            </ul>
          </div>

          <div className="md:col-span-3">
            <h3 className="font-semibold mb-4">Subscribe to our newsletter</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Stay updated with the latest features, tips, and insights from our team.
            </p>
            <div className="flex gap-2">
              <Input type="email" placeholder="Enter your email" className="rounded-full" />
              <Button size="icon" className="rounded-full h-10 w-10">
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-muted-foreground/10 my-8"></div>

        {/* Bottom Section */}
        <div className="flex flex-col md:flex-row justify-between gap-6">
          <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
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
          <div className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} JiraVision. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  )
}
