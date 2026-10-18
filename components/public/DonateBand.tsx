// ========================================
// HOMEPAGE - SUPPORT OUR MISSION
// ========================================
// ONE JOB: make the donation page impossible to miss, and explain honestly what
// the money is for.
//
// WHAT IT DOES NOT DO
//   It does not promise that a card payment works. The button goes to /donate,
//   where the real flow lives (choose a cause, then a real bank QR or eSewa ID
//   that an administrator has published). If no payment details have been
//   published, that page says so plainly instead of pretending.
// ========================================

import { ButtonLink } from '@/components/ui/Button';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Container } from '@/components/ui/Section';

const REASONS: { icon: IconName; title: string; text: string }[] = [
  {
    icon: 'book',
    title: 'Education and young people',
    text: 'Learning support, skills and opportunities for the next generation.',
  },
  {
    icon: 'users',
    title: 'Community development',
    text: 'Small, practical projects that make a neighbourhood work better.',
  },
  {
    icon: 'heart-handshake',
    title: 'Equality and social justice',
    text: 'Standing with people who are treated unfairly, and helping them be heard.',
  },
  {
    icon: 'leaf',
    title: 'Health and environment',
    text: 'Cleaner surroundings, health awareness and safer public spaces.',
  },
];

export function DonateBand() {
  return (
    <section className="relative overflow-hidden bg-brand-800 text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(circle at 88% 12%, rgba(228,136,11,0.30) 0, transparent 45%), radial-gradient(circle at 6% 90%, rgba(255,255,255,0.10) 0, transparent 40%)',
        }}
      />

      <Container className="relative py-14 sm:py-16">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-14">
          {/* ---------- the ask ---------- */}
          <div className="lg:col-span-5">
            <p className="eyebrow mb-3 text-accent-300">
              <Icon name="heart" className="h-4 w-4" />
              Support our mission
            </p>

            <h2 className="font-display text-2xl font-bold leading-tight sm:text-3xl">
              Support Our Mission
            </h2>

            <p className="mt-4 text-base leading-relaxed text-brand-100">
              Your support can help strengthen communities through education, equality, youth
              development, and community initiatives.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <ButtonLink href="/donate" variant="accent" size="lg">
                <Icon name="heart" className="h-5 w-5" />
                Donate Now
              </ButtonLink>

              <ButtonLink href="/contact" variant="outline-light" size="lg">
                Talk to us
              </ButtonLink>
            </div>

            <p className="mt-5 text-xs leading-relaxed text-brand-200">
              Every donation is recorded, checked by the office, and shown to you in your own donor
              account.
            </p>
          </div>

          {/* ---------- why ---------- */}
          <div className="lg:col-span-7">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-300">
              Why donate
            </p>

            <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {REASONS.map((reason) => (
                <li
                  key={reason.title}
                  className="rounded-card border border-white/15 bg-white/5 p-4 backdrop-blur-sm"
                >
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-btn bg-accent-500/20 text-accent-300">
                    <Icon name={reason.icon} className="h-4 w-4" />
                  </span>
                  <p className="mt-2.5 text-sm font-semibold text-white">{reason.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-brand-100">{reason.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Container>
    </section>
  );
}
