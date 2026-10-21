// ========================================
// HOME PAGE - HERO SECTION
// ========================================
// The big banner at the very top of the homepage.
//
// WHERE THE TEXT COMES FROM
//   Admin Panel -> Settings -> "Homepage content"
//   (with the defaults in lib/settings.ts until the organization fills them in)
//
// WHERE THE PICTURE COMES FROM
//   The published gallery photographs, rotating slowly behind the words. If none
//   have been published yet, the single hero image from Settings is used, and if
//   that is empty too the banner falls back to the club's own colours.
//
// The heading is the homepage's single <h1>, which is important for SEO.
// ========================================

import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { Container } from '@/components/ui/Section';
import { HeroBackdrop } from '@/components/public/HeroBackdrop';
import type { SliderPhoto } from '@/components/public/HeroSlider';
import { organization } from '@/config/site';
import { t } from '@/lib/i18n';
import { getLanguage } from '@/lib/i18n-server';
import { getSettings, setting } from '@/lib/settings';

// ========================================
// THE WORDS ON THE HERO
// ========================================
// They still come from Admin Panel -> Settings, so the club can change them at
// any time. Two constants below only matter for a site that has never been
// edited: the old shipped text is recognised and replaced with the current
// wording, instead of leaving the previous sentence in place for ever.
const LEGACY_TITLE = 'Working together for a fair and thriving community';

export async function Hero({ photos = [] }: { photos?: SliderPhoto[] }) {
  const lang = await getLanguage();
  const settings = await getSettings();

  const storedTitle = setting(settings, 'home.heroTitle');
  const storedSubtitle = setting(settings, 'home.heroSubtitle');
  const imageUrl = setting(settings, 'home.heroImageUrl', '');

  const title = !storedTitle || storedTitle.trim() === LEGACY_TITLE ? t(lang, 'hero.title') : storedTitle;

  const subtitle =
    !storedSubtitle || storedSubtitle.trim() === organization.tagline
      ? t(lang, 'hero.subtitle')
      : storedSubtitle;

  // The photographs that go behind the words: the published gallery first, the
  // single hero picture after that.
  const urls = photos.length > 0 ? photos.map((photo) => photo.imageUrl) : imageUrl ? [imageUrl] : [];

  return (
    <section className="relative isolate overflow-hidden bg-[#0b1f33] text-white">
      {/* ---------- The photographs ---------- */}
      {urls.length > 0 ? <HeroBackdrop urls={urls} /> : null}

      {/* ---------- Readability wash ----------
          Two soft layers of ink: one from the left so the words stay readable on
          a bright photograph, one from the bottom so the cards below sit on a
          calm edge. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-r from-[#06121e]/92 via-[#0b1f33]/70 to-[#0b1f33]/25"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-[#06121e]/85 via-transparent to-transparent"
      />

      <Container className="relative py-16 sm:py-20 lg:py-28">
        <div className="max-w-2xl">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">
            <Icon name="heart-handshake" className="h-3.5 w-3.5" />
            {t(lang, 'hero.eyebrow')}
          </p>

          {/* The one and only <h1> on the homepage */}
          <h1 className="font-display text-3xl font-bold leading-[1.15] drop-shadow-sm sm:text-4xl lg:text-[2.9rem]">
            {title}
          </h1>

          <p className="mt-5 max-w-xl text-base leading-relaxed text-white/90 sm:text-lg">
            {subtitle}
          </p>

          {/* ---------- Main call-to-action buttons ---------- */}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/about"
              className="inline-flex items-center justify-center rounded-lg bg-[#1c8a4e] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#16713f] sm:text-base"
            >
              {t(lang, 'hero.about')}
            </Link>

            <Link
              href="/projects"
              className="inline-flex items-center justify-center rounded-lg border-2 border-white/85 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white hover:text-[#0b1f33] sm:text-base"
            >
              {t(lang, 'hero.work')}
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
