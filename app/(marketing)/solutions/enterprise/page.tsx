import { MainNavbar } from "@/components/main-navbar"
import { MainFooter } from "@/components/main-footer"
import { Button } from "@/components/ui/button"
import { ArrowRight, Check, Building2, Shield, BarChart3, Users, Layers, Lock, Zap, Globe } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export default function EnterprisePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MainNavbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 md:py-32 bg-gradient-to-br from-slate-900 to-slate-800 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-grid-white/5 bg-[length:20px_20px] [mask-image:radial-gradient(white,transparent_70%)]"></div>
          <div className="container relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div className="flex flex-col gap-6">
                <div className="inline-block rounded-lg bg-blue-500/20 px-3 py-1 text-sm text-blue-400">
                  Enterprise Solutions
                </div>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                  Enterprise-Grade <span className="text-blue-400">Project Management</span>
                </h1>
                <p className="text-xl text-slate-300">
                  Secure, scalable, and customizable solutions designed for the complex needs of large organizations.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 mt-4">
                  <Link href="/contact">
                    <Button size="lg" className="gap-2 rounded-full bg-blue-500 hover:bg-blue-600 text-white">
                      Request a Demo <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="#features">
                    <Button
                      size="lg"
                      variant="outline"
                      className="rounded-full bg-transparent text-white border-white/20 hover:bg-white/10"
                    >
                      Learn More
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="relative h-[400px] w-full rounded-lg overflow-hidden">
                <div className="absolute -inset-0.5 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 opacity-20 blur-xl"></div>
                <div className="relative h-full w-full rounded-lg overflow-hidden shadow-xl border border-white/10">
                  <Image
                    src="https://images.unsplash.com/photo-1573164713988-8665fc963095?q=80&w=1169&auto=format&fit=crop"
                    alt="Enterprise Team Using JiraVision"
                    className="object-cover"
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    priority
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trusted By Section */}
        <section className="py-12 bg-slate-100">
          <div className="container">
            <div className="text-center mb-8">
              <p className="text-lg text-slate-600">Trusted by leading enterprises worldwide</p>
            </div>
            <div className="flex flex-wrap justify-center items-center gap-12 opacity-70">
              <div className="h-8 w-auto">
                <Image
                  src="https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/Microsoft_logo_%282012%29.svg/1280px-Microsoft_logo_%282012%29.svg.png"
                  alt="Microsoft"
                  width={120}
                  height={32}
                  className="h-full w-auto"
                />
              </div>
              <div className="h-8 w-auto">
                <Image
                  src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/IBM_logo.svg/1000px-IBM_logo.svg.png"
                  alt="IBM"
                  width={120}
                  height={32}
                  className="h-full w-auto"
                />
              </div>
              <div className="h-8 w-auto">
                <Image
                  src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/Oracle_logo.svg/2560px-Oracle_logo.svg.png"
                  alt="Oracle"
                  width={120}
                  height={32}
                  className="h-full w-auto"
                />
              </div>
              <div className="h-8 w-auto">
                <Image
                  src="https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Cisco_logo_blue_2016.svg/1280px-Cisco_logo_blue_2016.svg.png"
                  alt="Cisco"
                  width={120}
                  height={32}
                  className="h-full w-auto"
                />
              </div>
              <div className="h-8 w-auto">
                <Image
                  src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Deloitte_Logo.svg/1280px-Deloitte_Logo.svg.png"
                  alt="Deloitte"
                  width={120}
                  height={32}
                  className="h-full w-auto"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 bg-white">
          <div className="container">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-3 py-1 text-sm text-blue-600 mb-4">
                <Building2 className="h-4 w-4" />
                <span>Enterprise Features</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Built for Enterprise Scale</h2>
              <p className="text-xl text-slate-600 max-w-2xl mx-auto">
                JiraVision Enterprise provides the security, scalability, and customization that large organizations
                require.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="bg-white rounded-xl p-8 shadow-lg border border-slate-100 transform transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                <div className="h-14 w-14 rounded-full bg-blue-500/10 flex items-center justify-center mb-6">
                  <Shield className="h-7 w-7 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold mb-3">Enterprise-Grade Security</h3>
                <p className="text-slate-600">
                  SOC 2 Type II certified with advanced encryption, SSO, and role-based access controls to protect your
                  data.
                </p>
                <div className="mt-6 pt-6 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-blue-600 font-medium">Learn more</span>
                    <ArrowRight className="h-4 w-4 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-8 shadow-lg border border-slate-100 transform transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                <div className="h-14 w-14 rounded-full bg-blue-500/10 flex items-center justify-center mb-6">
                  <Layers className="h-7 w-7 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold mb-3">Unlimited Scalability</h3>
                <p className="text-slate-600">
                  Support for thousands of users, projects, and teams with high-performance infrastructure designed for
                  global enterprises.
                </p>
                <div className="mt-6 pt-6 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-blue-600 font-medium">Learn more</span>
                    <ArrowRight className="h-4 w-4 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-8 shadow-lg border border-slate-100 transform transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                <div className="h-14 w-14 rounded-full bg-blue-500/10 flex items-center justify-center mb-6">
                  <Globe className="h-7 w-7 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold mb-3">Global Deployment</h3>
                <p className="text-slate-600">
                  Multi-region deployment options with data residency controls to meet regulatory requirements
                  worldwide.
                </p>
                <div className="mt-6 pt-6 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-blue-600 font-medium">Learn more</span>
                    <ArrowRight className="h-4 w-4 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-8 shadow-lg border border-slate-100 transform transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                <div className="h-14 w-14 rounded-full bg-blue-500/10 flex items-center justify-center mb-6">
                  <Lock className="h-7 w-7 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold mb-3">Compliance & Governance</h3>
                <p className="text-slate-600">
                  Built-in compliance controls, audit logs, and governance features to meet the strictest regulatory
                  requirements.
                </p>
                <div className="mt-6 pt-6 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-blue-600 font-medium">Learn more</span>
                    <ArrowRight className="h-4 w-4 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-8 shadow-lg border border-slate-100 transform transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                <div className="h-14 w-14 rounded-full bg-blue-500/10 flex items-center justify-center mb-6">
                  <Zap className="h-7 w-7 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold mb-3">Custom AI Training</h3>
                <p className="text-slate-600">
                  Train our AI on your organization's unique processes, terminology, and historical data for maximum
                  effectiveness.
                </p>
                <div className="mt-6 pt-6 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-blue-600 font-medium">Learn more</span>
                    <ArrowRight className="h-4 w-4 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-8 shadow-lg border border-slate-100 transform transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                <div className="h-14 w-14 rounded-full bg-blue-500/10 flex items-center justify-center mb-6">
                  <Users className="h-7 w-7 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold mb-3">Dedicated Support</h3>
                <p className="text-slate-600">
                  24/7 premium support with dedicated account management, implementation services, and technical
                  consultants.
                </p>
                <div className="mt-6 pt-6 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-blue-600 font-medium">Learn more</span>
                    <ArrowRight className="h-4 w-4 text-blue-600" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Enterprise Benefits Section */}
        <section className="py-20 bg-gradient-to-br from-slate-50 to-slate-100">
          <div className="container">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div className="relative order-2 md:order-1">
                <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 opacity-20 blur-xl"></div>
                <div className="relative h-[400px] w-full rounded-xl overflow-hidden shadow-xl border border-slate-200">
                  <Image
                    src="https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=1170&auto=format&fit=crop"
                    alt="Enterprise Benefits"
                    className="object-cover"
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-6 order-1 md:order-2">
                <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-3 py-1 text-sm text-blue-600 w-fit">
                  <BarChart3 className="h-4 w-4" />
                  <span>Enterprise Benefits</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold">Why Enterprises Choose JiraVision</h2>
                <div className="space-y-6">
                  <div className="flex items-start gap-4 bg-white p-6 rounded-xl shadow-lg border border-slate-100 transform transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                    <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                      <Check className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Unified Platform</h3>
                      <p className="text-slate-600">
                        Consolidate project management, team wellbeing, and ethical governance in a single, integrated
                        platform.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 bg-white p-6 rounded-xl shadow-lg border border-slate-100 transform transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                    <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                      <Check className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Advanced Analytics</h3>
                      <p className="text-slate-600">
                        Enterprise-grade reporting and analytics with custom dashboards, data exports, and BI tool
                        integrations.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 bg-white p-6 rounded-xl shadow-lg border border-slate-100 transform transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                    <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                      <Check className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Enterprise Integrations</h3>
                      <p className="text-slate-600">
                        Seamless integration with your existing enterprise systems, including SAML, SCIM, and custom API
                        access.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 bg-white p-6 rounded-xl shadow-lg border border-slate-100 transform transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                    <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                      <Check className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Change Management</h3>
                      <p className="text-slate-600">
                        Comprehensive implementation services, training, and change management support for
                        enterprise-wide adoption.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Case Studies Section */}
        <section className="py-20 bg-white">
          <div className="container">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-3 py-1 text-sm text-blue-600 mb-4">
                <Building2 className="h-4 w-4" />
                <span>Success Stories</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Enterprise Success Stories</h2>
              <p className="text-xl text-slate-600 max-w-2xl mx-auto">
                See how leading enterprises have transformed their project management with JiraVision.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-xl overflow-hidden shadow-lg border border-slate-200">
                <div className="grid grid-cols-1 md:grid-cols-2">
                  <div className="relative h-full min-h-[200px]">
                    <Image
                      src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1170&auto=format&fit=crop"
                      alt="Global Financial Services"
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 25vw"
                    />
                  </div>
                  <div className="p-6">
                    <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-3 py-1 text-sm text-blue-600 mb-4">
                      <Building2 className="h-4 w-4" />
                      <span>Financial Services</span>
                    </div>
                    <h3 className="text-xl font-bold mb-3">Global Bank</h3>
                    <p className="text-slate-600 mb-4">
                      Implemented JiraVision Enterprise across 12,000 IT staff globally, reducing project delivery time
                      by 28% and improving compliance by 42%.
                    </p>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">ROI</span>
                        <span className="text-sm font-medium">247%</span>
                      </div>
                      <div className="relative h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="absolute left-0 top-0 h-full w-[70%] bg-blue-500 rounded-full"></div>
                      </div>
                    </div>
                    <Link href="/case-studies/global-bank">
                      <Button variant="link" className="p-0 h-auto mt-4 text-blue-600">
                        Read case study <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl overflow-hidden shadow-lg border border-slate-200">
                <div className="grid grid-cols-1 md:grid-cols-2">
                  <div className="relative h-full min-h-[200px]">
                    <Image
                      src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=1170&auto=format&fit=crop"
                      alt="Healthcare Enterprise"
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 25vw"
                    />
                  </div>
                  <div className="p-6">
                    <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-3 py-1 text-sm text-blue-600 mb-4">
                      <Building2 className="h-4 w-4" />
                      <span>Healthcare</span>
                    </div>
                    <h3 className="text-xl font-bold mb-3">National Healthcare</h3>
                    <p className="text-slate-600 mb-4">
                      Deployed JiraVision to manage 5,000+ healthcare projects, improving team wellbeing scores by 37%
                      while maintaining strict HIPAA compliance.
                    </p>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Efficiency Gain</span>
                        <span className="text-sm font-medium">32%</span>
                      </div>
                      <div className="relative h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="absolute left-0 top-0 h-full w-[32%] bg-blue-500 rounded-full"></div>
                      </div>
                    </div>
                    <Link href="/case-studies/national-healthcare">
                      <Button variant="link" className="p-0 h-auto mt-4 text-blue-600">
                        Read case study <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Implementation Process */}
        <section className="py-20 bg-gradient-to-br from-slate-50 to-slate-100">
          <div className="container">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-3 py-1 text-sm text-blue-600 mb-4">
                <Layers className="h-4 w-4" />
                <span>Implementation</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Enterprise Implementation Process</h2>
              <p className="text-xl text-slate-600 max-w-2xl mx-auto">
                Our proven methodology ensures a smooth transition and rapid time-to-value for enterprise deployments.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
              <div className="hidden md:block absolute top-24 left-[10%] right-[10%] h-0.5 bg-blue-200 z-0"></div>

              <div className="bg-white rounded-xl p-8 shadow-lg border border-slate-200 relative z-10">
                <div className="h-14 w-14 rounded-full bg-blue-100 flex items-center justify-center mb-6 mx-auto">
                  <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                    1
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-3 text-center">Discovery</h3>
                <p className="text-slate-600 text-center">
                  We analyze your current processes, systems, and requirements to create a tailored implementation plan.
                </p>
              </div>

              <div className="bg-white rounded-xl p-8 shadow-lg border border-slate-200 relative z-10">
                <div className="h-14 w-14 rounded-full bg-blue-100 flex items-center justify-center mb-6 mx-auto">
                  <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                    2
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-3 text-center">Configuration</h3>
                <p className="text-slate-600 text-center">
                  Our experts configure JiraVision to match your enterprise architecture and security requirements.
                </p>
              </div>

              <div className="bg-white rounded-xl p-8 shadow-lg border border-slate-200 relative z-10">
                <div className="h-14 w-14 rounded-full bg-blue-100 flex items-center justify-center mb-6 mx-auto">
                  <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                    3
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-3 text-center">Integration</h3>
                <p className="text-slate-600 text-center">
                  We integrate with your existing enterprise systems and migrate data to ensure continuity.
                </p>
              </div>

              <div className="bg-white rounded-xl p-8 shadow-lg border border-slate-200 relative z-10">
                <div className="h-14 w-14 rounded-full bg-blue-100 flex items-center justify-center mb-6 mx-auto">
                  <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                    4
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-3 text-center">Adoption</h3>
                <p className="text-slate-600 text-center">
                  Comprehensive training, change management, and ongoing support to ensure enterprise-wide adoption.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-br from-blue-600 to-blue-800 relative overflow-hidden">
          <div className="absolute inset-0 bg-grid-white/10 bg-[length:20px_20px] [mask-image:radial-gradient(white,transparent_85%)]"></div>
          <div className="container relative z-10">
            <div className="max-w-3xl mx-auto text-center text-white">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Transform Your Enterprise?</h2>
              <p className="text-xl mb-8 text-white/90">
                Join leading enterprises already using JiraVision to improve project delivery, team wellbeing, and
                ethical governance.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/contact">
                  <Button size="lg" variant="secondary" className="rounded-full">
                    Request a Demo
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button
                    size="lg"
                    variant="outline"
                    className="rounded-full bg-transparent text-white border-white hover:bg-white/10"
                  >
                    Contact Sales
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
