// ========================================
// HOME PAGE - HERO SECTION
// ========================================
// The big banner at the very top of the homepage.
//
// WHERE THE TEXT COMES FROM
//   Admin Panel -> Settings -> "Homepage content"
//   (with the defaults in lib/settings.ts until the organization fills them in)
//
// The heading is the homepage's single <h1>, which is important for SEO.
// ========================================

import Link from 'next/link';
import Image from 'next/image';
import { Icon } from '@/components/ui/Icon';
import { Container } from '@/components/ui/Section';
import { getSettings, setting } from '@/lib/settings';

export async function Hero() {
  const settings = await getSettings();

  const title = setting(settings, 'home.heroTitle');
  const subtitle = setting(settings, 'home.heroSubtitle');
  const imageUrl = setting(settings, 'home.heroImageUrl', '');

  return (
    <section className="relative overflow-hidden bg-brand-900 text-white">
      {/* ---------- Decorative background ---------- */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(circle at 12% 20%, rgba(255,255,255,0.16) 0, transparent 42%), radial-gradient(circle at 88% 8%, rgba(228,136,11,0.28) 0, transparent 45%)',
        }}
      />
      {/* A thin accent bar along the top */}
      <div aria-hidden="true" className="h-1.5 w-full bg-gradient-to-r from-accent-400 to-accent-600" />

      <Container className="relative py-14 sm:py-20 lg:py-24">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-14">
          {/* ---------- Left: text and buttons ---------- */}
          <div className="lg:col-span-7">
            <p className="eyebrow mb-4 text-accent-300">
              <Icon name="heart-handshake" className="h-4 w-4" />
              Community-based youth organization
            </p>

            {/* The one and only <h1> on the homepage */}
            <h1 className="font-display text-3xl font-bold leading-[1.15] sm:text-4xl lg:text-5xl">
              {title}
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-relaxed text-brand-100 sm:text-lg">
              {subtitle}
            </p>

            {/* ---------- Main call-to-action buttons ---------- */}
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/join" className="btn btn-accent btn-lg">
                Join our community
                <Icon name="arrow-right" className="h-5 w-5" />
              </Link>

              <Link href="/programs" className="btn btn-outline-light btn-lg">
                Explore our programs
              </Link>

              <Link
                href="/donate"
                className="btn btn-lg text-white underline decoration-accent-300 decoration-2 underline-offset-4 hover:decoration-accent-400"
              >
                <Icon name="heart" className="h-5 w-5" />
                Donate
              </Link>
            </div>
          </div>

          {/* ---------- Right: picture or a simple highlight card ---------- */}
          <div className="lg:col-span-5">
            {imageUrl ? (
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-card ring-1 ring-white/20">
                <Image
                  src={imageUrl}
                  alt="Community members working together"
                  fill
                  sizes="(max-width: 1024px) 100vw, 40vw"
                  className="object-cover"
                  priority
                />
              </div>
            ) : (
              /* No picture has been uploaded yet - show a clean card instead
                 of an empty space or a borrowed image. */
              <div className="rounded-card border border-white/15 bg-white/5 p-6 backdrop-blur-sm">
                <p className="text-sm font-semibold uppercase tracking-wide text-accent-300">
                  What we work for
                </p>

                <ul className="mt-4 space-y-3 text-sm text-brand-50">
                  {[
                    'Equality and dignity for every family',
                    'Education and opportunity for young people',
                    'Women empowered to lead and earn',
                    'Healthier, safer and cleaner communities',
                  ].map((item) => (
                    <li key={item} className="flex gap-3">
                      <Icon name="check-circle" className="mt-0.5 h-5 w-5 shrink-0 text-accent-300" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <p className="mt-5 border-t border-white/15 pt-4 text-xs text-brand-200">
                  Replace this card with a photo of your work in Admin Panel → Settings →
                  Homepage content.
                </p>
              </div>
            )}
          </div>
        </div>
      </Container>
    </section>
  );
}
