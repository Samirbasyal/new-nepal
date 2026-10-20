// ========================================
// CONTACT
// This code controls the Contact page.
// ========================================
// Address: /contact
//
// WHERE THE CONTACT DETAILS COME FROM
//   Admin Panel -> Settings -> "Contact information" and "Social media links"
//   (with the fallback values in config/site.ts)
//
//   Any field that has not been filled in shows the shipped placeholder, for
//   example "[Add official contact number]", so nothing false is ever
//   published.
//
// THE FORM
//   components/forms/ContactForm.tsx -> POST /api/contact -> stored in the
//   database -> read by administrators in Admin Panel -> Contact messages.
// ========================================

import type { Metadata } from 'next';
import { t } from '@/lib/i18n';
import { getLanguage } from '@/lib/i18n-server';
import { ContactForm } from '@/components/forms/ContactForm';
import { Icon, type IconName } from '@/components/ui/Icon';
import { PageHero, Section } from '@/components/ui/Section';
import { getSettings, hasRealValue, setting } from '@/lib/settings';
import { organization } from '@/config/site';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Contact us',
  description:
    'Contact Janakalyan Samataa Yuwa Club - address, phone number, email address and enquiry form.',
};

const SOCIAL_LINKS: { key: string; label: string; icon: IconName }[] = [
  { key: 'social.facebook', label: 'Facebook', icon: 'globe' },
  { key: 'social.instagram', label: 'Instagram', icon: 'image' },
  { key: 'social.youtube', label: 'YouTube', icon: 'activity' },
  { key: 'social.twitter', label: 'X (Twitter)', icon: 'megaphone' },
  { key: 'social.linkedin', label: 'LinkedIn', icon: 'briefcase' },
  { key: 'social.tiktok', label: 'TikTok', icon: 'sparkles' },
];

export default async function ContactPage() {
  
  const lang = await getLanguage();
const settings = await getSettings();

  const orgName = setting(settings, 'org.name', organization.name);
  const address = setting(settings, 'contact.address');
  const phone = setting(settings, 'contact.phone');
  const phoneAlt = setting(settings, 'contact.phoneAlt', '');
  const email = setting(settings, 'contact.email');
  const officeHours = setting(settings, 'contact.officeHours');
  const mapEmbedUrl = setting(settings, 'contact.mapEmbedUrl', '');
  const mapLinkUrl = setting(settings, 'contact.mapLinkUrl', '');

  const socialLinks = SOCIAL_LINKS.map((item) => ({
    ...item,
    url: setting(settings, item.key, ''),
  })).filter((item) => hasRealValue(item.url));

  return (
    <>
      <PageHero
        eyebrow={t(lang, 'contact.eyebrow')}
        icon="mail"
        title={t(lang, 'contact.title')}
        description="We would be glad to hear from you - whether you want to volunteer, support our work, or simply ask a question."
      />

      <Section>
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-14">
          {/* ========================================
              CONTACT DETAILS
              ======================================== */}
          <aside className="lg:col-span-5">
            <div className="space-y-6">
              <div className="card p-6">
                <h2 className="text-base font-bold text-ink-900">Our office</h2>

                <ul className="mt-4 space-y-4 text-sm">
                  <li className="flex gap-3">
                    <Icon name="building" className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
                    <span>
                      <span className="block font-semibold text-ink-800">{orgName}</span>
                      <span className="block text-ink-600">{address}</span>
                    </span>
                  </li>

                  <li className="flex gap-3">
                    <Icon name="phone" className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
                    <span>
                      <span className="block font-semibold text-ink-800">Phone</span>
                      <span className="block text-ink-600">{phone}</span>
                      {hasRealValue(phoneAlt) ? (
                        <span className="block text-ink-600">{phoneAlt}</span>
                      ) : null}
                    </span>
                  </li>

                  <li className="flex gap-3">
                    <Icon name="mail" className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
                    <span>
                      <span className="block font-semibold text-ink-800">Email</span>
                      <span className="block break-all text-ink-600">{email}</span>
                    </span>
                  </li>

                  <li className="flex gap-3">
                    <Icon name="clock" className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
                    <span>
                      <span className="block font-semibold text-ink-800">Office hours</span>
                      <span className="block text-ink-600">{officeHours}</span>
                    </span>
                  </li>
                </ul>

                {/* ---------- Social media ---------- */}
                {socialLinks.length > 0 ? (
                  <>
                    <h3 className="mt-6 border-t border-ink-100 pt-5 text-sm font-bold text-ink-900">
                      Follow us
                    </h3>
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {socialLinks.map((item) => (
                        <li key={item.key}>
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-full border border-ink-300 px-3.5 py-1.5 text-xs font-medium text-ink-700 transition-colors hover:border-brand-500 hover:text-brand-700"
                          >
                            <Icon name={item.icon} className="h-3.5 w-3.5" />
                            {item.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
              </div>

              {/* ========================================
                  MAP
                  The map only appears when an administrator has pasted an
                  embed link in Admin Panel -> Settings.
                  ======================================== */}
              {hasRealValue(mapEmbedUrl) ? (
                <div className="card overflow-hidden">
                  <iframe
                    src={mapEmbedUrl}
                    title={`Map showing the location of ${orgName}`}
                    className="h-64 w-full border-0"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                  {hasRealValue(mapLinkUrl) ? (
                    <div className="border-t border-ink-100 p-4">
                      <a
                        href={mapLinkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline"
                      >
                        Open in Google Maps
                        <Icon name="external-link" className="h-4 w-4" />
                      </a>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="card p-6">
                  <h2 className="flex items-center gap-2 text-base font-bold text-ink-900">
                    <Icon name="map-pin" className="h-5 w-5 text-brand-600" />
                    Location
                  </h2>
                  <p className="mt-2 text-sm text-ink-600">
                    A map is not shown yet. An administrator can add a Google Maps embed link in
                    Admin Panel → Settings → Contact information.
                  </p>
                </div>
              )}

              {/* ---------- Membership ---------- */}
              <div className="card bg-brand-50/60 p-6">
                <h2 className="text-base font-bold text-ink-900">Already a member?</h2>
                <p className="mt-2 text-sm text-ink-600">
                  Sign in to your member panel to see notices, programs, events and your tasks.
                </p>
                <a href="/member/login" className="btn btn-outline mt-4 w-full">
                  <Icon name="log-in" className="h-4 w-4" />
                  Member sign in
                </a>
              </div>
            </div>
          </aside>

          {/* ========================================
              CONTACT FORM
              ======================================== */}
          <div className="lg:col-span-7">
            <h2 className="mb-5 font-display text-xl font-bold text-ink-900 sm:text-2xl">
              Send us a message
            </h2>
            <ContactForm />
          </div>
        </div>
      </Section>
    </>
  );
}
