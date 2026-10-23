import type { Metadata } from "next"
import Link from "next/link"
import { PrintButton } from "@/components/features/print-button"
import { onePager } from "@/content/one-pagers"

export function generateMetadata(): Metadata {
  return {
    title: "JiraVision One-Pager — Printable Overview",
    description:
      "A compact, print-friendly summary of JiraVision: products, pricing snapshot, ethical stance and contact details.",
    alternates: { canonical: "/one-pager" },
  }
}

export default async function OnePagerPage() {
  return (
    <div className="bg-background py-10 md:py-16 print:bg-white print:py-0">
      <div className="container px-4 print:px-0">
        <article className="mx-auto max-w-3xl rounded-2xl border border-neutral-200 bg-white p-8 font-serif text-neutral-900 shadow-sm md:p-12 print:max-w-none print:break-inside-auto print:rounded-none print:border-0 print:p-0 print:shadow-none">
          {/* Header — the as-of line is the document stamp; date constant flagged NOTE(PLACEHOLDER) in content/one-pagers.ts */}
          <header className="break-inside-avoid border-b border-neutral-200 pb-6">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-neutral-500">
              One-Pager
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">{onePager.title}</h1>
            <p className="mt-1 text-base text-neutral-700">{onePager.subtitle}</p>
            <p className="mt-3 text-xs text-neutral-500">{onePager.asOfLine}</p>
            <div className="mt-5 print:hidden">
              <PrintButton />
            </div>
          </header>

          <section className="mt-6 break-inside-avoid" aria-labelledby="op-about">
            <h2 id="op-about" className="text-lg font-semibold">
              What it is
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-neutral-800">{onePager.intro}</p>
          </section>

          <section className="mt-6 break-inside-avoid" aria-labelledby="op-products">
            <h2 id="op-products" className="text-lg font-semibold">
              The four products
            </h2>
            <dl className="mt-2 grid gap-x-8 gap-y-2 sm:grid-cols-2">
              {onePager.products.map((p) => (
                <div key={p.name} className="break-inside-avoid">
                  <dt className="text-sm font-semibold">{p.name}</dt>
                  <dd className="text-sm leading-snug text-neutral-700">{p.line}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="mt-6 break-inside-avoid" aria-labelledby="op-pricing">
            <h2 id="op-pricing" className="text-lg font-semibold">
              {onePager.pricing.heading}
            </h2>
            <table className="mt-2 w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-neutral-300 text-left">
                  <th scope="col" className="py-1.5 pr-4 font-semibold">
                    Plan
                  </th>
                  <th scope="col" className="py-1.5 pr-4 font-semibold">
                    Price
                  </th>
                  <th scope="col" className="py-1.5 font-semibold">
                    Includes
                  </th>
                </tr>
              </thead>
              <tbody>
                {onePager.pricing.plans.map((plan) => (
                  <tr key={plan.name} className="break-inside-avoid border-b border-neutral-200">
                    <td className="py-1.5 pr-4 font-medium">{plan.name}</td>
                    <td className="py-1.5 pr-4 whitespace-nowrap">{plan.price}</td>
                    <td className="py-1.5 text-neutral-700">{plan.blurb}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs leading-relaxed text-neutral-600">{onePager.pricing.note}</p>
          </section>

          <section className="mt-6 break-inside-avoid" aria-labelledby="op-ethics">
            <h2 id="op-ethics" className="text-lg font-semibold">
              {onePager.ethics.heading}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-neutral-800">{onePager.ethics.summary}</p>
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
              What we refuse to build
            </p>
            <ul className="mt-1 grid list-disc gap-1 pl-5 text-sm marker:text-neutral-400 sm:grid-cols-2">
              {onePager.ethics.refusals.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="mt-2 text-sm">
              <Link href={onePager.ethics.link.href} className="underline underline-offset-4 hover:no-underline">
                {onePager.ethics.link.label}
              </Link>
            </p>
          </section>

          <section className="mt-6 break-inside-avoid border-t border-neutral-200 pt-6" aria-labelledby="op-contact">
            <h2 id="op-contact" className="text-lg font-semibold">
              {onePager.contact.heading}
            </h2>
            <dl className="mt-2 grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
              <div className="flex gap-2">
                <dt className="text-neutral-500">Email</dt>
                <dd>
                  <a href={`mailto:${onePager.contact.email}`} className="underline underline-offset-4 hover:no-underline">
                    {onePager.contact.email}
                  </a>
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-neutral-500">Support</dt>
                <dd>
                  <a
                    href={`mailto:${onePager.contact.supportEmail}`}
                    className="underline underline-offset-4 hover:no-underline"
                  >
                    {onePager.contact.supportEmail}
                  </a>
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-neutral-500">Phone</dt>
                <dd>
                  <a href={onePager.contact.phoneHref} className="underline underline-offset-4 hover:no-underline">
                    {onePager.contact.phone}
                  </a>
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-neutral-500">Web</dt>
                <dd>{onePager.contact.web}</dd>
              </div>
              <div className="flex gap-2 sm:col-span-2">
                <dt className="text-neutral-500">Address</dt>
                <dd>{onePager.contact.address}</dd>
              </div>
            </dl>
            <p className="mt-2 text-sm">
              <Link href={onePager.contact.contactHref} className="underline underline-offset-4 hover:no-underline">
                Send us a message
              </Link>{" "}
              <span className="text-neutral-500">(prints as a link — details above are enough)</span>
            </p>
          </section>

          <footer className="mt-8 break-inside-avoid border-t border-neutral-200 pt-4">
            <nav aria-label="Legal documents">
              <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-600">
                {onePager.legalLinks.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="underline underline-offset-4 hover:no-underline">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <p className="mt-2 text-[0.7rem] text-neutral-500">
              {onePager.asOfLine}
            </p>
            <div className="mt-4 print:hidden">
              <Link href="/" className="text-sm underline underline-offset-4 hover:no-underline">
                ← Back to the full site
              </Link>
            </div>
          </footer>
        </article>
      </div>
    </div>
  )
}
