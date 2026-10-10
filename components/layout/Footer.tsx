// ========================================
// FOOTER
// ========================================
// The bottom of every public page.
//
// WHAT IS CONTROLLED HERE
//   - the organization description (config/site.ts -> footer.aboutText)
//   - the quick links (config/site.ts -> navigation)
//   - the contact details (Admin Panel -> Settings, with fallback to config/site.ts)
//   - the social media links (Admin Panel -> Settings -> SOCIAL)
//   - the copyright line
// ========================================

import Link from 'next/link';
import { LogoMark } from '@/components/layout/Logo';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Container } from '@/components/ui/Section';
import { footer as footerConfig, navPrimary, organization } from '@/config/site';
import { getSettings, hasRealValue, setting } from '@/lib/settings';

// Social links. An empty value means the icon is simply not shown.
const SOCIAL_FIELDS: { key: string; label: string; icon: IconName }[] = [
  { key: 'social.facebook', label: 'Facebook', icon: 'globe' },
  { key: 'social.instagram', label: 'Instagram', icon: 'image' },
  { key: 'social.youtube', label: 'YouTube', icon: 'activity' },
  { key: 'social.twitter', label: 'X (Twitter)', icon: 'megaphone' },
  { key: 'social.linkedin', label: 'LinkedIn', icon: 'briefcase' },
  { key: 'social.tiktok', label: 'TikTok', icon: 'sparkles' },
];

export async function Footer() {
  const settings = await getSettings();

  const orgName = setting(settings, 'org.name', organization.name);
  const address = setting(settings, 'contact.address');
  const phone = setting(settings, 'contact.phone');
  const email = setting(settings, 'contact.email');

  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto bg-brand-900 text-brand-50">
      <Container className="py-12 lg:py-16">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* ---------- Column 1: who we are ---------- */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-3">
              <LogoMark size={44} onDark />
              <span className="font-display text-base font-bold text-white">{orgName}</span>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-brand-100">
              {footerConfig.aboutText}
            </p>

            {/* ---------- Social media links ---------- */}
            <ul className="mt-5 flex flex-wrap gap-2">
              {SOCIAL_FIELDS.map((field) => {
                const url = setting(settings, field.key, '');
                if (!hasRealValue(url)) return null;
                return (
                  <li key={field.key}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full border border-white/25 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:border-white hover:bg-white/10"
                    >
                      <Icon name={field.icon} className="h-3.5 w-3.5" />
                      {field.label}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* ---------- Column 2: quick links ---------- */}
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wide text-white">Explore</h2>
            <ul className="mt-4 space-y-2.5">
              {navPrimary.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-brand-100 transition-colors hover:text-white hover:underline"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ---------- Column 3: get involved ---------- */}
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wide text-white">Get involved</h2>
            <ul className="mt-4 space-y-2.5">
              {[
                { label: 'Join Community', href: '/join' },
                { label: 'Donate', href: '/donate' },
                { label: 'Our Works', href: '/our-works' },
                { label: 'Impact', href: '/impact' },
                { label: 'Members', href: '/members' },
                { label: 'Donors', href: '/donors' },
                { label: 'Gallery', href: '/gallery' },
                { label: 'Contact', href: '/contact' },
                { label: 'Member Login', href: '/member/login' },
              ].map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-brand-100 transition-colors hover:text-white hover:underline"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ---------- Column 4: contact details ---------- */}
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wide text-white">Contact</h2>
            <ul className="mt-4 space-y-3 text-sm text-brand-100">
              <li className="flex gap-2.5">
                <Icon name="map-pin" className="mt-0.5 h-4 w-4 shrink-0 text-accent-300" />
                <span>{address}</span>
              </li>
              <li className="flex gap-2.5">
                <Icon name="phone" className="mt-0.5 h-4 w-4 shrink-0 text-accent-300" />
                <span>{phone}</span>
              </li>
              <li className="flex gap-2.5">
                <Icon name="mail" className="mt-0.5 h-4 w-4 shrink-0 text-accent-300" />
                <span className="break-all">{email}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* ---------- Bottom bar ---------- */}
        <div className="mt-10 flex flex-col gap-4 border-t border-white/15 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-brand-200">
            © {year} {orgName}. {footerConfig.copyrightText}
          </p>

          <ul className="flex flex-wrap items-center gap-4">
            {footerConfig.legalLinks.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-xs text-brand-200 transition-colors hover:text-white"
                >
                  {item.label}
                </Link>
              </li>
            ))}
            {/* A discreet administrator entrance. It is only a link to the
                login page - the panel itself stays protected by the server. */}
            <li>
              <Link
                href="/admin/login"
                className="text-xs text-brand-300/70 transition-colors hover:text-white"
              >
                Administration
              </Link>
            </li>
          </ul>
        </div>
      </Container>
    </footer>
  );
}
