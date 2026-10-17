// ========================================
// DONATE - THE STARTING PAGE
// ========================================
// Address: /donate
//
// WHAT THIS PAGE IS ALLOWED TO SHOW
//   A welcome, the reasons to give, and ONE button: "Donate Here".
//
//   No QR code and no bank account number appear here. They appear on the
//   payment step only, after the donor has chosen an amount and a method. That
//   is deliberate: a QR printed next to a "Donate" button invites people to send
//   money without telling us who they are, and then nobody can match the payment
//   to a donation.
//
// WHERE THE MONEY DETAILS COME FROM
//   Admin Panel -> Settings -> Donation information (keys donate.*).
//   The payment step reads exactly the same settings, so the club never has to
//   maintain two copies of its bank details.
//
// WHAT THIS PAGE DOES NOT DO
//   It does not process payments and does not ask for card numbers. A donor pays
//   through their own bank or wallet app, then submits the receipt for the
//   office to verify.
// ========================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { PageHero, Section, SectionHeading } from '@/components/ui/Section';
import { organization } from '@/config/site';
import { getSettings, setting } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Donate',
  description:
    'Support the work of Janakalyan Samataa Yuwa Club. Choose a cause, tell us who you are, and pay by bank transfer or eSewa.',
};

/** The four steps, shown as a strip so a donor knows how long this takes. */
const STEPS = [
  { icon: 'heart' as const, title: 'Choose a cause', text: 'Pick what your gift should support.' },
  { icon: 'user-plus' as const, title: 'Your details', text: 'Name, email and mobile number.' },
  { icon: 'banknote' as const, title: 'Pay securely', text: 'Set the amount, then pay by bank or eSewa.' },
  { icon: 'check-circle' as const, title: 'We verify', text: 'The office checks your receipt, usually within 24 hours.' },
];

export default async function DonatePage() {
  const settings = await getSettings();

  const intro = setting(settings, 'donate.intro');
  const note = setting(settings, 'donate.note', '');
  const orgName = setting(settings, 'org.name', organization.name);

  return (
    <>
      <PageHero
        eyebrow="Donate"
        icon="heart"
        title="Support our work"
        description={intro}
      />

      {/* ========================================
          THE WELCOME AND THE ONE BUTTON
          ======================================== */}
      <Section>
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-7">
            <SectionHeading
              eyebrow="Your kindness matters"
              icon="heart-handshake"
              title="Every contribution changes a life"
            />

            <p className="mt-4 text-base leading-relaxed text-ink-700">
              Your kindness can make a meaningful difference in someone&apos;s life. Choose a cause
              you care about and help us build a stronger, more supportive community.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
              <ButtonLink href="/donate/start" variant="primary" size="lg" className="w-full sm:w-auto">
                <Icon name="heart" className="h-5 w-5" />
                Donate Here
              </ButtonLink>

              <ButtonLink href="/donate/status" variant="outline" size="lg" className="w-full sm:w-auto">
                Already donated? Check status
              </ButtonLink>
            </div>

            <p className="mt-4 text-xs text-ink-500">
              It takes about two minutes. You pay from your own bank or wallet app, then send us the
              receipt so the office can confirm it.
            </p>

            {/* ---------- What your support makes possible ---------- */}
            <div className="mt-10">
              <h2 className="text-base font-bold text-ink-900">What your support makes possible</h2>

              <ul className="mt-4 space-y-3">
                {[
                  {
                    icon: 'stethoscope' as const,
                    title: 'Health and medical help',
                    text: 'Treatment costs, medicines and health camps.',
                  },
                  {
                    icon: 'book' as const,
                    title: 'Education',
                    text: 'School materials, fees and study support for students in need.',
                  },
                  {
                    icon: 'heart-handshake' as const,
                    title: 'Families in difficulty',
                    text: 'Direct help for households going through a hard time.',
                  },
                  {
                    icon: 'leaf' as const,
                    title: 'Community development',
                    text: 'Cleanliness, environment and shared community improvements.',
                  },
                ].map((item) => (
                  <li key={item.title} className="card flex gap-4 p-5">
                    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-card bg-brand-50 text-brand-600">
                      <Icon name={item.icon} className="h-5 w-5" />
                    </span>
                    <span>
                      <span className="block text-sm font-bold text-ink-900">{item.title}</span>
                      <span className="block text-sm text-ink-600">{item.text}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* ========================================
              HOW IT WORKS (SIDEBAR)
              ======================================== */}
          <aside className="lg:col-span-5">
            <div className="card p-6">
              <h2 className="flex items-center gap-2 text-base font-bold text-ink-900">
                <Icon name="sparkles" className="h-5 w-5 text-brand-600" />
                How donating works
              </h2>

              <ol className="mt-4 space-y-4">
                {STEPS.map((step, index) => (
                  <li key={step.title} className="flex gap-3">
                    <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                      {index + 1}
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-ink-900">{step.title}</span>
                      <span className="block text-sm text-ink-600">{step.text}</span>
                    </span>
                  </li>
                ))}
              </ol>

              <p className="mt-5 rounded-card bg-brand-50/70 p-3 text-xs leading-relaxed text-ink-600">
                Your donation is marked successful only after the office has checked the payment.
                Bank account details and the QR code are shown on the payment step, never before.
              </p>
            </div>

            <div className="card mt-5 bg-brand-50/60 p-6">
              {note ? <p className="text-sm leading-relaxed text-ink-700">{note}</p> : null}

              <ButtonLink href="/contact" variant="outline" className="mt-4 w-full">
                <Icon name="mail" className="h-4 w-4" />
                Contact us about giving
              </ButtonLink>

              <p className="mt-3 text-center text-xs text-ink-500">
                Prefer to talk first?{' '}
                <Link href="/contact" className="font-medium text-brand-700 hover:underline">
                  Reach out to our office
                </Link>
                .
              </p>
            </div>

            <p className="mt-4 text-center text-xs text-ink-500">
              If you receive any message claiming to collect money for {orgName} outside these
              steps, please verify it with our office first.
            </p>
          </aside>
        </div>
      </Section>

      {/* ========================================
          NOT ONLY MONEY
          ======================================== */}
      <Section muted>
        <SectionHeading
          eyebrow="Other ways to help"
          icon="users"
          title="Support does not have to be money"
          description="Time, skills, materials and connections all make a difference."
          align="center"
        />

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {[
            {
              icon: 'user-plus' as const,
              title: 'Volunteer your time',
              text: 'Join an activity or help with organising.',
              href: '/join',
              label: 'Join community',
            },
            {
              icon: 'briefcase' as const,
              title: 'Share your skills',
              text: 'Teach, design, translate, photograph or advise.',
              href: '/join',
              label: 'Offer a skill',
            },
            {
              icon: 'heart-handshake' as const,
              title: 'Connect us with others',
              text: 'Introduce us to organizations that share our goals.',
              href: '/contact',
              label: 'Get in touch',
            },
          ].map((item) => (
            <div key={item.title} className="card p-6 text-center">
              <span className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-card bg-accent-50 text-accent-600">
                <Icon name={item.icon} className="h-6 w-6" />
              </span>
              <h3 className="text-base font-bold text-ink-900">{item.title}</h3>
              <p className="mt-2 text-sm text-ink-600">{item.text}</p>
              <ButtonLink href={item.href} variant="outline" className="mt-4 w-full">
                {item.label}
              </ButtonLink>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
