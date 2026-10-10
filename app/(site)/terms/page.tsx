// ========================================
// TERMS PAGE
// ========================================
// Plain-language terms of use for this website.
// Kept short and honest: it describes only what the website actually does.
// ========================================

import type { Metadata } from 'next';
import { PageHero, Section } from '@/components/ui/Section';
import { getSettings, setting } from '@/lib/settings';
import { organization } from '@/config/site';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Terms of use',
  description: 'Terms of use for the Janakalyan Samataa Yuwa Club website.',
};

export default async function TermsPage() {
  const settings = await getSettings();
  const orgName = setting(settings, 'org.name', organization.name);

  const sections = [
    {
      title: 'About this website',
      body: `This website is operated by ${orgName}. It provides public information about the organization and its work, and gives members a private area to view notices, programs, events and their own tasks.`,
    },
    {
      title: 'Accuracy of information',
      body: 'We aim to keep the information on this website accurate and up to date. Content is entered by the organization, and figures such as impact numbers are only published when the organization has recorded a verified value. If you notice something that looks wrong, please tell us so we can correct it.',
    },
    {
      title: 'Your account',
      body: 'If you create a member account you are responsible for keeping your password private. Do not share your account with anyone. Tell the office immediately if you think somebody else has accessed your account.',
    },
    {
      title: 'Acceptable use',
      body: 'Please do not attempt to access areas of this website that you have not been given access to, do not submit false or harmful information through our forms, and do not upload content that you do not have the right to use.',
    },
    {
      title: 'Pictures and text',
      body: 'Photographs and text on this website belong to the organization or are used with permission. Please ask before re-using them.',
    },
    {
      title: 'Donations',
      body: 'This website does not process payments. Contribution details shown on the Donate page are provided by the organization. Always confirm bank details with our office before transferring money.',
    },
    {
      title: 'External links',
      body: 'This website may link to other websites. We are not responsible for the content or privacy practices of those websites.',
    },
    {
      title: 'Changes',
      body: 'These terms may be updated from time to time as the website develops.',
    },
  ];

  return (
    <>
      <PageHero
        eyebrow="Terms"
        icon="file-text"
        title="Terms of use"
        description="Simple, plain-language conditions for using this website."
      />

      <Section>
        <div className="mx-auto max-w-3xl">
          {sections.map((section) => (
            <section key={section.title} className="mb-8">
              <h2 className="font-display text-xl font-bold text-ink-900">{section.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-700">{section.body}</p>
            </section>
          ))}

          <p className="border-t border-ink-200 pt-6 text-xs text-ink-500">
            This is a general description prepared for this website and is not legal advice. If the
            organization needs formally reviewed terms, a qualified adviser should be consulted.
          </p>
        </div>
      </Section>
    </>
  );
}
