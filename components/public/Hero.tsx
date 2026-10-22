// ========================================
// HOME PAGE - HERO SECTION
// ========================================
// The big banner at the very top of the homepage.
//
// WHAT CHANGED (and why)
//   The heading used to sit ON TOP of the photographs, with two dark gradient
//   layers behind it so the white words stayed readable. That meant every
//   photograph was permanently covered by a heavy wash and the words crowded it.
//
//   The photographs are now shown on their own, full width and unwashed, and the
//   words sit in their own clean band directly underneath. Nothing is laid over
//   the pictures any more: no gradient, no tint, no text. The band is ordinary
//   page background, so the heading is easier to read than it ever was on a
//   photograph - and it is the same on a phone as on a desktop.
//
//   The heading is still the homepage's single <h1>, which matters for search
//   engines, and it still comes from Admin Panel -> Settings, so the club can
//   change the wording without touching code.
//
// IF THERE ARE NO PHOTOGRAPHS YET
//   An empty dark band would look broken, so that case falls back to the original
//   dark banner with the words inside it. A brand-new site therefore still looks
//   finished.
// ========================================

import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { Container } from '@/components/ui/Section';
import { HeroBackdrop } from '@/components/public/HeroBackdrop';
import type { SliderPhoto } from '@/components/public/HeroSlider';
import { organization } from '@/config/site';
import { t, type Lang } from '@/lib/i18n';
import { getLanguage } from '@/lib/i18n-server';
import { getSettings, setting } from '@/lib/settings';

// ========================================
// THE WORDS
// ========================================
// They still come from Admin Panel -> Settings, so the club can change them at
// any time. The constant below only matters for a site that has never been
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

  // The photographs: the published slider photos first, the single hero picture
  // from Settings after that.
  const urls = photos.length > 0 ? photos.map((photo) => photo.imageUrl) : imageUrl ? [imageUrl] : [];

  // ========================================
  // NO PHOTOGRAPHS YET - the old dark banner, words inside
  // ========================================
  if (urls.length === 0) {
    return (
      <section className="relative isolate overflow-hidden bg-[#0b1f33] text-white">
        <Container className="py-14 sm:py-16 lg:py-20">
          <div className="max-w-2xl">
            <Eyebrow lang={lang} tone="dark" />
            <Heading title={title} tone="dark" />
            <Subtitle subtitle={subtitle} tone="dark" />
            <Actions lang={lang} tone="dark" />
          </div>
        </Container>
      </section>
    );
  }

  // ========================================
  // PHOTOGRAPHS, THEN THE WORDS BELOW THEM
  // ========================================
  return (
    <>
      {/*
        ---------- The photographs, untouched ----------

        A fixed height keeps the band predictable while the pictures inside it
        still "cover" the full width and rotate every seven seconds. There is no
        overlay layer of any kind here, so what the club uploaded is what visitors
        see. Clicking a picture still opens it full size (PhotoZoom reads the
        data-photo-full attribute set by HeroBackdrop).
      */}
      <section
        aria-label="Photographs from the club's work"
        className="relative isolate h-[240px] w-full overflow-hidden bg-[#0b1f33] sm:h-[340px] lg:h-[440px]"
      >
        <HeroBackdrop urls={urls} />
      </section>

      {/* ---------- The words, on a plain, readable background ---------- */}
      <section className="border-b border-ink-200 bg-white">
        <Container className="py-9 sm:py-11">
          <div className="max-w-3xl">
            <Eyebrow lang={lang} tone="light" />
            <Heading title={title} tone="light" />
            <Subtitle subtitle={subtitle} tone="light" />
            <Actions lang={lang} tone="light" />
          </div>
        </Container>
      </section>
    </>
  );
}

// ========================================
// THE FOUR PIECES OF THE HERO COPY
// ========================================
// Split out only so the "with photographs" and "without photographs" versions
// cannot drift apart in wording.

function Eyebrow({ lang, tone }: { lang: Lang; tone: 'dark' | 'light' }) {
  return (
    <p
      className={
        tone === 'dark'
          ? 'mb-4 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white backdrop-blur-sm'
          : 'mb-3 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-brand-800 ring-1 ring-brand-100'
      }
    >
      <Icon name="heart-handshake" className="h-3.5 w-3.5" />
      {t(lang, 'hero.eyebrow')}
    </p>
  );
}

function Heading({ title, tone }: { title: string; tone: 'dark' | 'light' }) {
  // The one and only <h1> on the homepage.
  return (
    <h1
      className={
        tone === 'dark'
          ? 'font-display text-3xl font-bold leading-[1.18] drop-shadow-sm sm:text-[2.1rem] lg:text-[2.4rem]'
          : 'font-display text-3xl font-bold leading-tight text-ink-900 sm:text-[2.1rem] lg:text-[2.4rem]'
      }
    >
      {title}
    </h1>
  );
}

function Subtitle({ subtitle, tone }: { subtitle: string; tone: 'dark' | 'light' }) {
  return (
    <p
      className={
        tone === 'dark'
          ? 'mt-5 max-w-xl text-base leading-relaxed text-white/90 sm:text-lg'
          : 'mt-3 max-w-2xl text-base leading-relaxed text-ink-600'
      }
    >
      {subtitle}
    </p>
  );
}

function Actions({ lang, tone }: { lang: Lang; tone: 'dark' | 'light' }) {
  return (
    <div className="mt-7 flex flex-wrap items-center gap-3">
      <Link
        href="/about"
        className={
          tone === 'dark'
            ? 'inline-flex items-center justify-center rounded-lg bg-[#1c8a4e] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#16713f] sm:text-base'
            : 'btn btn-primary'
        }
      >
        {t(lang, 'hero.about')}
      </Link>

      <Link
        href="/projects"
        className={
          tone === 'dark'
            ? 'inline-flex items-center justify-center rounded-lg border-2 border-white/85 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white hover:text-[#0b1f33] sm:text-base'
            : 'btn btn-outline'
        }
      >
        {t(lang, 'hero.work')}
      </Link>

      {/* ========================================
          NEWS
          ======================================== */}
      {/*
        Straight to the news page, where every notice an administrator writes and
        publishes appears. It sits next to About and Our Work because that is where
        a visitor looks first, and the same notices are also listed on the home page
        directly below this banner.
      */}
      <Link
        href="/news"
        className={
          tone === 'dark'
            ? 'inline-flex items-center justify-center rounded-lg border-2 border-white/85 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white hover:text-[#0b1f33] sm:text-base'
            : 'btn btn-outline'
        }
      >
        {t(lang, 'nav.news')}
      </Link>
    </div>
  );
}
