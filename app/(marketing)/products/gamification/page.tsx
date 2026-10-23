import { MainNavbar } from "@/components/main-navbar"
import { MainFooter } from "@/components/main-footer"
import { Button } from "@/components/ui/button"
import {
  ArrowRight,
  Trophy,
  Target,
  Award,
  Gamepad2,
  Star,
  Medal,
  Users,
  Zap,
  BarChart3,
  Gift,
  Check,
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export default function GamificationPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MainNavbar />

      <main className="flex-1">
        {/* Hero Section - Immersive Design with Particles */}
        <section className="relative py-24 md:py-32 overflow-hidden bg-black">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1511512578047-dfb367046420?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2000&q=80')] bg-cover bg-center opacity-20"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black"></div>
          <div className="container relative z-10">
            <div className="max-w-3xl mx-auto text-center text-white">
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/20 px-3 py-1 text-sm text-amber-400 mb-4">
                <Gamepad2 className="h-4 w-4" />
                <span>Gamification Suite</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
                Make Work <span className="text-amber-400">Engaging</span>
              </h1>
              <p className="text-xl text-white/80 mb-8">
                Transform your team's experience with personalized motivation engines, skill trees, rewards, and visual
                storytelling.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/signup">
                  <Button size="lg" className="gap-2 rounded-full bg-amber-500 hover:bg-amber-600 text-black">
                    Try It Free <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="#features">
                  <Button
                    size="lg"
                    variant="outline"
                    className="rounded-full bg-transparent text-white border-white hover:bg-white/10"
                  >
                    Explore Features
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Floating Cards Section */}
        <section className="py-16 relative -mt-20">
          <div className="container">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-xl border border-slate-200 dark:border-slate-800 relative transform hover:-translate-y-2 transition-all duration-300">
                <div className="absolute -top-5 left-6 h-10 w-10 rounded-full bg-amber-500 text-white flex items-center justify-center">
                  <Trophy className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-bold mb-2 mt-4">Achievement System</h3>
                <p className="text-muted-foreground">
                  Customizable badges, levels, and rewards that recognize team and individual accomplishments.
                </p>
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex flex-wrap gap-2">
                    <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                      <Medal className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                      <Star className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                      <Trophy className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-xl border border-slate-200 dark:border-slate-800 relative transform hover:-translate-y-2 transition-all duration-300">
                <div className="absolute -top-5 left-6 h-10 w-10 rounded-full bg-amber-500 text-white flex items-center justify-center">
                  <Target className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-bold mb-2 mt-4">Skill Trees</h3>
                <p className="text-muted-foreground">
                  Visual progression paths that help team members develop new skills and track their growth.
                </p>
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <div className="relative h-8 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="absolute left-0 top-0 h-full w-3/4 bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"></div>
                    <div className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                      75% Complete
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-xl border border-slate-200 dark:border-slate-800 relative transform hover:-translate-y-2 transition-all duration-300">
                <div className="absolute -top-5 left-6 h-10 w-10 rounded-full bg-amber-500 text-white flex items-center justify-center">
                  <Award className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-bold mb-2 mt-4">Team Challenges</h3>
                <p className="text-muted-foreground">
                  Collaborative goals and friendly competition that foster teamwork and drive collective success.
                </p>
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between text-sm">
                    <span>Current Challenge:</span>
                    <span className="font-medium text-amber-600 dark:text-amber-400">Sprint Champion</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section - Interactive Cards */}
        <section id="features" className="py-24 bg-slate-50 dark:bg-slate-900">
          <div className="container">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-3 py-1 text-sm text-amber-500 mb-4">
                <Zap className="h-4 w-4" />
                <span>Key Features</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Gamification That Works</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Our platform is built on behavioral science principles to create meaningful engagement, not just
                superficial rewards.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="bg-white dark:bg-slate-900 rounded-xl overflow-hidden shadow-lg border border-slate-200 dark:border-slate-800 group hover:shadow-xl transition-all duration-300">
                <div className="h-48 relative overflow-hidden">
                  <Image
                    src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80"
                    alt="Team Leaderboards"
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
                  <div className="absolute bottom-4 left-4 text-white">
                    <h3 className="text-xl font-bold">Team Leaderboards</h3>
                  </div>
                </div>
                <div className="p-6">
                  <p className="text-muted-foreground mb-4">
                    Dynamic leaderboards that celebrate team and individual achievements while fostering healthy
                    competition.
                  </p>
                  <ul className="space-y-2 mb-4">
                    <li className="flex items-start gap-2">
                      <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="h-3 w-3 text-green-600" />
                      </div>
                      <span className="text-sm">Customizable metrics</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="h-3 w-3 text-green-600" />
                      </div>
                      <span className="text-sm">Team and individual views</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="h-3 w-3 text-green-600" />
                      </div>
                      <span className="text-sm">Historical performance tracking</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-xl overflow-hidden shadow-lg border border-slate-200 dark:border-slate-800 group hover:shadow-xl transition-all duration-300">
                <div className="h-48 relative overflow-hidden">
                  <Image
                    src="https://images.unsplash.com/photo-1553877522-43269d4ea984?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80"
                    alt="Reward Marketplace"
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
                  <div className="absolute bottom-4 left-4 text-white">
                    <h3 className="text-xl font-bold">Reward Marketplace</h3>
                  </div>
                </div>
                <div className="p-6">
                  <p className="text-muted-foreground mb-4">
                    Customizable reward systems that let team members redeem points for meaningful benefits and perks.
                  </p>
                  <ul className="space-y-2 mb-4">
                    <li className="flex items-start gap-2">
                      <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="h-3 w-3 text-green-600" />
                      </div>
                      <span className="text-sm">Company-specific rewards</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="h-3 w-3 text-green-600" />
                      </div>
                      <span className="text-sm">Integration with popular gift cards</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="h-3 w-3 text-green-600" />
                      </div>
                      <span className="text-sm">Charitable donation options</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-xl overflow-hidden shadow-lg border border-slate-200 dark:border-slate-800 group hover:shadow-xl transition-all duration-300">
                <div className="h-48 relative overflow-hidden">
                  <Image
                    src="https://images.unsplash.com/photo-1519389950473-47ba0277781c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80"
                    alt="Progress Visualization"
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
                  <div className="absolute bottom-4 left-4 text-white">
                    <h3 className="text-xl font-bold">Progress Visualization</h3>
                  </div>
                </div>
                <div className="p-6">
                  <p className="text-muted-foreground mb-4">
                    Beautiful, interactive visualizations that make progress and achievements tangible and motivating.
                  </p>
                  <ul className="space-y-2 mb-4">
                    <li className="flex items-start gap-2">
                      <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="h-3 w-3 text-green-600" />
                      </div>
                      <span className="text-sm">Skill trees and progression paths</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="h-3 w-3 text-green-600" />
                      </div>
                      <span className="text-sm">Achievement galleries</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="h-3 w-3 text-green-600" />
                      </div>
                      <span className="text-sm">Team journey maps</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-24 bg-white dark:bg-slate-950">
          <div className="container">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-3 py-1 text-sm text-amber-500 mb-4">
                <Target className="h-4 w-4" />
                <span>Process</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">How Gamification Works</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Our approach is designed to create lasting engagement through meaningful experiences.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
              <div className="hidden md:block absolute top-1/2 left-1/3 right-1/3 h-0.5 bg-amber-200 -translate-y-1/2 z-0"></div>

              <div className="bg-white dark:bg-slate-900 rounded-xl p-8 shadow-lg border border-slate-200 dark:border-slate-800 relative z-10">
                <div className="h-14 w-14 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-6 mx-auto">
                  <div className="h-10 w-10 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold">
                    1
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-3 text-center">Define Objectives</h3>
                <p className="text-muted-foreground text-center">
                  We work with you to identify key behaviors and outcomes that drive success for your team.
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-xl p-8 shadow-lg border border-slate-200 dark:border-slate-800 relative z-10">
                <div className="h-14 w-14 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-6 mx-auto">
                  <div className="h-10 w-10 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold">
                    2
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-3 text-center">Design Engagement</h3>
                <p className="text-muted-foreground text-center">
                  Our platform creates personalized motivation systems based on your team's unique dynamics.
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-xl p-8 shadow-lg border border-slate-200 dark:border-slate-800 relative z-10">
                <div className="h-14 w-14 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-6 mx-auto">
                  <div className="h-10 w-10 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold">
                    3
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-3 text-center">Measure & Refine</h3>
                <p className="text-muted-foreground text-center">
                  Continuous analytics help optimize the system for maximum engagement and productivity.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Case Studies Section */}
        <section className="py-24 bg-slate-50 dark:bg-slate-900">
          <div className="container">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-3 py-1 text-sm text-amber-500 mb-4">
                <BarChart3 className="h-4 w-4" />
                <span>Results</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Success Stories</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                See how our gamification platform has transformed team engagement and productivity.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white dark:bg-slate-900 rounded-xl overflow-hidden shadow-lg border border-slate-200 dark:border-slate-800">
                <div className="grid grid-cols-1 md:grid-cols-2">
                  <div className="relative h-full min-h-[200px]">
                    <Image
                      src="https://images.unsplash.com/photo-1552664730-d307ca884978?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80"
                      alt="TechNova Case Study"
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 25vw"
                    />
                  </div>
                  <div className="p-6">
                    <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-3 py-1 text-sm text-amber-500 mb-4">
                      <Users className="h-4 w-4" />
                      <span>Tech Company</span>
                    </div>
                    <h3 className="text-xl font-bold mb-3">TechNova</h3>
                    <p className="text-muted-foreground mb-4">
                      Increased developer productivity by 32% and reduced turnover by 24% within six months of
                      implementing our gamification platform.
                    </p>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Team Engagement</span>
                        <span className="text-sm font-medium">+47%</span>
                      </div>
                      <div className="relative h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="absolute left-0 top-0 h-full w-[47%] bg-amber-500 rounded-full"></div>
                      </div>
                    </div>
                    <Link href="/case-studies/technova">
                      <Button variant="link" className="p-0 h-auto mt-4 text-amber-500">
                        Read case study <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-xl overflow-hidden shadow-lg border border-slate-200 dark:border-slate-800">
                <div className="grid grid-cols-1 md:grid-cols-2">
                  <div className="relative h-full min-h-[200px]">
                    <Image
                      src="https://images.unsplash.com/photo-1556761175-5973dc0f32e7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80"
                      alt="GreenHealth Case Study"
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 25vw"
                    />
                  </div>
                  <div className="p-6">
                    <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-3 py-1 text-sm text-amber-500 mb-4">
                      <Users className="h-4 w-4" />
                      <span>Healthcare</span>
                    </div>
                    <h3 className="text-xl font-bold mb-3">GreenHealth</h3>
                    <p className="text-muted-foreground mb-4">
                      Improved compliance with best practices by 41% and boosted employee satisfaction scores from 3.2
                      to 4.7 out of 5.
                    </p>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Training Completion</span>
                        <span className="text-sm font-medium">+63%</span>
                      </div>
                      <div className="relative h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="absolute left-0 top-0 h-full w-[63%] bg-amber-500 rounded-full"></div>
                      </div>
                    </div>
                    <Link href="/case-studies/greenhealth">
                      <Button variant="link" className="p-0 h-auto mt-4 text-amber-500">
                        Read case study <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="py-24 bg-white dark:bg-slate-950">
          <div className="container">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-3 py-1 text-sm text-amber-500 mb-4">
                <Gift className="h-4 w-4" />
                <span>Pricing</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Add gamification to your existing JiraVision plan or purchase as a standalone product.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <div className="bg-white dark:bg-slate-900 rounded-xl p-8 shadow-lg border border-slate-200 dark:border-slate-800 flex flex-col">
                <div className="mb-6">
                  <h3 className="text-lg font-medium mb-2">Starter</h3>
                  <div className="flex items-baseline mb-4">
                    <span className="text-4xl font-bold">$5</span>
                    <span className="text-muted-foreground ml-2">/ user / month</span>
                  </div>
                  <p className="text-muted-foreground">Essential gamification features for small teams.</p>
                </div>

                <ul className="space-y-3 mb-8 flex-grow">
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
                    <span>Basic achievement system</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
                    <span>Team leaderboards</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
                    <span>5 custom badges</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
                    <span>Basic analytics</span>
                  </li>
                </ul>

                <Link href="/signup">
                  <Button variant="outline" className="w-full rounded-full">
                    Start Free Trial
                  </Button>
                </Link>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-xl p-8 shadow-lg border-2 border-amber-500 flex flex-col relative">
                <div className="absolute top-0 right-0 bg-amber-500 text-white px-4 py-1 rounded-bl-lg rounded-tr-lg text-sm font-medium">
                  Most Popular
                </div>

                <div className="mb-6">
                  <h3 className="text-lg font-medium mb-2">Professional</h3>
                  <div className="flex items-baseline mb-4">
                    <span className="text-4xl font-bold">$12</span>
                    <span className="text-muted-foreground ml-2">/ user / month</span>
                  </div>
                  <p className="text-muted-foreground">Advanced gamification features for growing teams.</p>
                </div>

                <ul className="space-y-3 mb-8 flex-grow">
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
                    <span>Everything in Starter</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
                    <span>Custom reward marketplace</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
                    <span>Skill trees and progression paths</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
                    <span>20 custom badges</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
                    <span>Advanced analytics</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
                    <span>API access</span>
                  </li>
                </ul>

                <Link href="/signup">
                  <Button className="w-full rounded-full bg-amber-500 hover:bg-amber-600 text-white">
                    Start Free Trial
                  </Button>
                </Link>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-xl p-8 shadow-lg border border-slate-200 dark:border-slate-800 flex flex-col">
                <div className="mb-6">
                  <h3 className="text-lg font-medium mb-2">Enterprise</h3>
                  <div className="flex items-baseline mb-4">
                    <span className="text-4xl font-bold">$20</span>
                    <span className="text-muted-foreground ml-2">/ user / month</span>
                  </div>
                  <p className="text-muted-foreground">Custom gamification solutions for large organizations.</p>
                </div>

                <ul className="space-y-3 mb-8 flex-grow">
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
                    <span>Everything in Professional</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
                    <span>Custom gamification design</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
                    <span>Unlimited custom badges</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
                    <span>White-label options</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
                    <span>Dedicated success manager</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
                    <span>Custom integrations</span>
                  </li>
                </ul>

                <Link href="/contact">
                  <Button variant="outline" className="w-full rounded-full">
                    Contact Sales
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-br from-amber-500 to-amber-600 relative overflow-hidden">
          <div className="absolute inset-0 bg-grid-white/10 bg-[length:20px_20px] [mask-image:radial-gradient(white,transparent_85%)]"></div>
          <div className="container relative z-10">
            <div className="max-w-3xl mx-auto text-center text-white">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Transform Your Team's Experience?</h2>
              <p className="text-xl mb-8 text-white/90">
                Join thousands of teams already using JiraVision's Gamification Suite to boost engagement, productivity,
                and satisfaction.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/signup">
                  <Button size="lg" variant="secondary" className="rounded-full">
                    Start Your Free Trial
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button
                    size="lg"
                    variant="outline"
                    className="rounded-full bg-transparent text-white border-white hover:bg-white/10"
                  >
                    Schedule a Demo
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <MainFooter />
    </div>
  )
}
