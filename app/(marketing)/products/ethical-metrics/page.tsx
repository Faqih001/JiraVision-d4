import { MainNavbar } from "@/components/main-navbar"
import { MainFooter } from "@/components/main-footer"
import { Button } from "@/components/ui/button"
import { Check, ArrowRight, Shield, Users, BarChart2, Scale, LineChart, PieChart } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export default function EthicalMetricsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MainNavbar />

      <main className="flex-1">
        {/* Hero Section - Modern Split Design */}
        <section className="relative py-24 md:py-32 overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100">
          <div className="absolute inset-0 bg-grid-slate-200 [mask-image:radial-gradient(ellipse_at_center,white,transparent_70%)]"></div>
          <div className="container relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div className="flex flex-col gap-6">
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary w-fit">
                  <Shield className="h-4 w-4" />
                  <span>Ethical Governance</span>
                </div>
                <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
                  Build <span className="text-primary">Ethical</span> Teams
                </h1>
                <p className="text-xl text-muted-foreground">
                  Ensure fair and balanced team management with real-time DEI, workload, and pay equity enforcement.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 mt-4">
                  <Link href="/signup">
                    <Button size="lg" className="gap-2 rounded-full">
                      Try It Free <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="#features">
                    <Button size="lg" variant="outline" className="rounded-full">
                      Learn More
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="relative">
                <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-primary to-purple-600 opacity-30 blur-xl"></div>
                <div className="relative h-[400px] w-full rounded-xl overflow-hidden border shadow-xl">
                  <Image
                    src="https://images.unsplash.com/photo-1573164713988-8665fc963095?q=80&w=2069&auto=format&fit=crop"
                    alt="Ethical Metrics Dashboard"
                    className="object-cover"
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 bg-white">
          <div className="container">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
              <div className="bg-white rounded-xl p-6 shadow-lg border border-slate-100 text-center transform transition-all duration-300 hover:scale-105 hover:shadow-xl">
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Users className="h-7 w-7 text-primary" />
                </div>
                <p className="text-4xl font-bold text-primary">100%</p>
                <p className="text-sm text-muted-foreground mt-1">DEI Compliance</p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-lg border border-slate-100 text-center transform transition-all duration-300 hover:scale-105 hover:shadow-xl">
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Scale className="h-7 w-7 text-primary" />
                </div>
                <p className="text-4xl font-bold text-primary">98%</p>
                <p className="text-sm text-muted-foreground mt-1">Pay Equity</p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-lg border border-slate-100 text-center transform transition-all duration-300 hover:scale-105 hover:shadow-xl">
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <BarChart2 className="h-7 w-7 text-primary" />
                </div>
                <p className="text-4xl font-bold text-primary">45%</p>
                <p className="text-sm text-muted-foreground mt-1">Reduced Bias</p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-lg border border-slate-100 text-center transform transition-all duration-300 hover:scale-105 hover:shadow-xl">
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <LineChart className="h-7 w-7 text-primary" />
                </div>
                <p className="text-4xl font-bold text-primary">30%</p>
                <p className="text-sm text-muted-foreground mt-1">Better Retention</p>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section - Modern Card Design */}
        <section id="features" className="py-24 bg-gradient-to-br from-slate-50 to-slate-100">
          <div className="container">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary mb-4">
                <Shield className="h-4 w-4" />
                <span>Key Features</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-bold mb-4">Ethical Governance Tools</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Our Ethical Metrics suite helps you build fair, balanced, and inclusive teams.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="group bg-white rounded-xl p-8 shadow-lg border border-slate-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                  <BarChart2 className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3">DEI Analytics</h3>
                <p className="text-muted-foreground mb-6">
                  Comprehensive diversity, equity, and inclusion metrics with actionable insights for improvement.
                </p>
                <div className="mt-6 pt-6 border-t relative h-48">
                  <Image
                    src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1171&auto=format&fit=crop"
                    alt="DEI Analytics"
                    className="rounded-lg object-cover transform group-hover:scale-105 transition-transform duration-500"
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
              </div>

              <div className="group bg-white rounded-xl p-8 shadow-lg border border-slate-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                  <Scale className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3">Pay Equity Monitoring</h3>
                <p className="text-muted-foreground mb-6">
                  Identify and address compensation disparities across gender, ethnicity, and other dimensions.
                </p>
                <div className="mt-6 pt-6 border-t relative h-48">
                  <Image
                    src="https://images.unsplash.com/photo-1434626881859-194d67b2b86f?q=80&w=1174&auto=format&fit=crop"
                    alt="Pay Equity Monitoring"
                    className="rounded-lg object-cover transform group-hover:scale-105 transition-transform duration-500"
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
              </div>

              <div className="group bg-white rounded-xl p-8 shadow-lg border border-slate-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                  <PieChart className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3">Workload Fairness</h3>
                <p className="text-muted-foreground mb-6">
                  Ensure equitable distribution of work and opportunities across all team members.
                </p>
                <div className="mt-6 pt-6 border-t relative h-48">
                  <Image
                    src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=1170&auto=format&fit=crop"
                    alt="Workload Fairness"
                    className="rounded-lg object-cover transform group-hover:scale-105 transition-transform duration-500"
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section - Modern Split Design */}
        <section className="py-24 bg-white">
          <div className="container">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
              <div className="flex flex-col gap-8">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary mb-4">
                    <Shield className="h-4 w-4" />
                    <span>The Impact</span>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold mb-6">Why Ethical Metrics Matter</h2>
                  <p className="text-lg text-muted-foreground mb-8">
                    Build a more inclusive, fair, and high-performing organization with data-driven ethical governance.
                  </p>
                </div>

                <div className="space-y-6">
                  <div className="flex items-start gap-4 p-6 bg-white rounded-xl shadow-lg border border-slate-100 transform transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                    <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                      <Check className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Attract Top Talent</h3>
                      <p className="text-muted-foreground">
                        Organizations with strong ethical practices attract and retain the best candidates in the
                        market.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-6 bg-white rounded-xl shadow-lg border border-slate-100 transform transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                    <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                      <Check className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Improve Team Performance</h3>
                      <p className="text-muted-foreground">
                        Fair and inclusive teams demonstrate higher levels of innovation, collaboration, and
                        productivity.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-6 bg-white rounded-xl shadow-lg border border-slate-100 transform transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                    <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                      <Check className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Reduce Legal Risk</h3>
                      <p className="text-muted-foreground">
                        Proactively identify and address potential compliance issues before they become problems.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative">
                <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-primary to-purple-600 opacity-30 blur-xl"></div>
                <div className="relative h-[500px] w-full rounded-xl overflow-hidden border shadow-xl">
                  <Image
                    src="https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=1170&auto=format&fit=crop"
                    alt="Ethical Metrics Benefits"
                    className="object-cover"
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials Section - Modern Card Design */}
        <section className="py-24 bg-gradient-to-br from-slate-50 to-slate-100">
          <div className="container">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary mb-4">
                <Users className="h-4 w-4" />
                <span>Customer Stories</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-bold mb-4">What Our Customers Say</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Hear from organizations that have transformed their culture with JiraVision's Ethical Metrics.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white rounded-xl overflow-hidden shadow-lg border border-slate-100 relative transform transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                <div className="h-32 bg-gradient-to-r from-primary/20 to-purple-600/20"></div>
                <div className="p-8 -mt-16">
                  <div className="h-16 w-16 rounded-full bg-white p-1 shadow-lg mb-4 relative">
                    <Image
                      src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=1976&auto=format&fit=crop"
                      alt="Olivia Martinez"
                      className="rounded-full object-cover"
                      fill
                      sizes="64px"
                    />
                  </div>
                  <p className="italic text-muted-foreground mb-6">
                    "The DEI analytics helped us identify blind spots in our hiring and promotion practices that we
                    weren't aware of. We've made significant improvements as a result."
                  </p>
                  <div>
                    <h4 className="font-semibold">Olivia Martinez</h4>
                    <p className="text-sm text-muted-foreground">Chief People Officer, EquityTech</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl overflow-hidden shadow-lg border border-slate-100 relative transform transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                <div className="h-32 bg-gradient-to-r from-primary/20 to-purple-600/20"></div>
                <div className="p-8 -mt-16">
                  <div className="h-16 w-16 rounded-full bg-white p-1 shadow-lg mb-4 relative">
                    <Image
                      src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1974&auto=format&fit=crop"
                      alt="Robert Kim"
                      className="rounded-full object-cover"
                      fill
                      sizes="64px"
                    />
                  </div>
                  <p className="italic text-muted-foreground mb-6">
                    "The pay equity monitoring tools helped us identify and address compensation gaps we didn't know
                    existed. Our team trust has improved dramatically."
                  </p>
                  <div>
                    <h4 className="font-semibold">Robert Kim</h4>
                    <p className="text-sm text-muted-foreground">VP of HR, FairForce</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl overflow-hidden shadow-lg border border-slate-100 relative transform transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                <div className="h-32 bg-gradient-to-r from-primary/20 to-purple-600/20"></div>
                <div className="p-8 -mt-16">
                  <div className="h-16 w-16 rounded-full bg-white p-1 shadow-lg mb-4 relative">
                    <Image
                      src="https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?q=80&w=1974&auto=format&fit=crop"
                      alt="Amara Johnson"
                      className="rounded-full object-cover"
                      fill
                      sizes="64px"
                    />
                  </div>
                  <p className="italic text-muted-foreground mb-6">
                    "Workload fairness metrics helped us realize we were consistently overloading certain team members.
                    Balancing the work has improved both morale and output quality."
                  </p>
                  <div>
                    <h4 className="font-semibold">Amara Johnson</h4>
                    <p className="text-sm text-muted-foreground">Engineering Director, BalancedWorks</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section - Modern Gradient Design */}
        <section className="py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/90 to-purple-700/90"></div>
          <div className="absolute inset-0 bg-grid-white/10 bg-[length:20px_20px] [mask-image:radial-gradient(white,transparent_85%)]"></div>
          <div className="container relative z-10">
            <div className="max-w-3xl mx-auto text-center text-white">
              <h2 className="text-3xl md:text-5xl font-bold mb-6">Ready to Build a More Ethical Organization?</h2>
              <p className="text-xl mb-8 text-white/80">
                Join forward-thinking companies already using JiraVision's Ethical Metrics to create fair and balanced
                teams.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/signup">
                  <Button size="lg" variant="secondary" className="rounded-full">
                    Start Free Trial
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
