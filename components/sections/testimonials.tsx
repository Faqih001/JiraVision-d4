import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Section, SectionHeading, Reveal } from "@/components/sections/section"
import { testimonials } from "@/content/home"

export function Testimonials() {
  return (
    <Section>
      <SectionHeading eyebrow="Testimonials" title={testimonials.title} />
      <div className="grid gap-5 md:grid-cols-3">
        {testimonials.items.map((t) => (
          <Reveal key={t.quote}>
            <figure className="flex h-full flex-col rounded-lg border bg-card p-6 shadow-soft">
              <blockquote className="flex-1 text-sm leading-relaxed">
                <p>&ldquo;{t.quote}&rdquo;</p>
              </blockquote>
              <figcaption className="mt-5 flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">{t.initials}</AvatarFallback>
                </Avatar>
                <div className="text-xs">
                  <div className="font-medium">{t.name}</div>
                  <div className="text-muted-foreground">{t.role}</div>
                </div>
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>
    </Section>
  )
}
