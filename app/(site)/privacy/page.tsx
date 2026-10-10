// ========================================
// PRIVACY PAGE
// ========================================
// A plain-language explanation of what this website stores and why.
// It describes exactly what the code in this project does, so it stays
// truthful. Read it once and adjust it if you add more features later.
// ========================================

import type { Metadata } from 'next';
import { PageHero, Section } from '@/components/ui/Section';
import { getSettings, setting } from '@/lib/settings';
import { organization } from '@/config/site';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Privacy',
  description: 'How Janakalyan Samataa Yuwa Club handles information submitted through this website.',
};

export default async function PrivacyPage() {
  const settings = await getSettings();
  const orgName = setting(settings, 'org.name', organization.name);
  const contactEmail = setting(settings, 'contact.email');

  const sections = [
    {
      title: 'What this website stores',
      body: [
        'When you send the "Join Community" form we store your name, phone number, optional email address, address, area of interest and message.',
        'When you send the "Contact" form we store your name, email address, optional phone number, subject and message.',
        'When you create a member account we store your name, email address, a securely hashed password, and the profile details you choose to add.',
      ],
    },
    {
      title: 'Who can see it',
      body: [
        'Only signed-in administrators can read contact messages and join applications. These are never shown on the public website.',
        'Member profiles are private by default. A member only appears on the public Members page if an administrator switches their profile to public, and even then only their name, photo, role and short introduction are shown.',
        'We never publish email addresses, phone numbers, membership numbers or addresses.',
      ],
    },
    {
      title: 'Passwords',
      body: [
        'Passwords are never stored as text. They are converted into a one-way bcrypt hash, which means nobody - including the administrators - can read them back.',
      ],
    },
    {
      title: 'Donations',
      body: [
        'This website does not take payments and does not ask for card or wallet details. Donation records kept by the office are stored in a private section of the website that is never shown publicly.',
      ],
    },
    {
      title: 'Cookies',
      body: [
        'One cookie is used, and only after you sign in. It holds a signed token that keeps you signed in. It contains no advertising identifiers and is not shared with anyone.',
        'There are no advertising or tracking cookies on this website.',
      ],
    },
    {
      title: 'How long information is kept',
      body: [
        'Contact messages and join applications are kept until an administrator deletes them, so that the office can follow up on your enquiry.',
        'You can ask us to delete the information you submitted at any time.',
      ],
    },
  ];

  return (
    <>
      <PageHero
        eyebrow="Privacy"
        icon="shield-check"
        title="Privacy"
        description={`How ${orgName} handles the information you send through this website.`}
      />

      <Section>
        <div className="mx-auto max-w-3xl">
          {sections.map((section) => (
            <section key={section.title} className="mb-8">
              <h2 className="font-display text-xl font-bold text-ink-900">{section.title}</h2>
              {section.body.map((paragraph, index) => (
                <p key={index} className="mt-3 text-sm leading-relaxed text-ink-700">
                  {paragraph}
                </p>
              ))}
            </section>
          ))}

          <section className="mb-8">
            <h2 className="font-display text-xl font-bold text-ink-900">Asking us to remove data</h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-700">
              To ask what we hold about you, or to ask us to delete it, contact the office
              {contactEmail ? ` at ${contactEmail}` : ''} and an administrator will respond.
            </p>
          </section>

          <p className="border-t border-ink-200 pt-6 text-xs text-ink-500">
            This page describes the behaviour of the website as built. If the organization adds
            features later (for example online payments or newsletter emails), this page should be
            updated to match.
          </p>
        </div>
      </Section>
    </>
  );
}
