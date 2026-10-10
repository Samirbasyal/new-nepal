// ========================================
// DONATE
// This code controls the Donate page.
// ========================================
// Address: /donate
//
// VERY IMPORTANT - SECURITY AND HONESTY
//   1. This page does NOT process payments. It shows the ways the
//      organization actually accepts contributions (bank transfer, QR code,
//      cash at the office, cheque...).
//   2. The bank details shown here are ordinary public banking information
//      that the organization chooses to publish. They are typed by an
//      administrator in Admin Panel -> Settings -> Donation information.
//   3. No payment gateway is connected, because wiring one up without real
//      merchant credentials would be pretending. If the organization later
//      gets an online gateway, add it here using the provider's own secure
//      checkout - never type card details into this project.
//   4. If a field is empty it is simply not shown, so the page never displays
//      an incomplete or misleading bank detail.
// ========================================

import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Alert } from '@/components/ui/Alert';
import { PageHero, Section, SectionHeading } from '@/components/ui/Section';
import { getSettings, hasRealValue, setting } from '@/lib/settings';
import { organization } from '@/config/site';
import { parseLines } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Donate',
  description:
    'Support the work of Janakalyan Samataa Yuwa Club - bank transfer, QR code and other ways to give.',
};

export default async function DonatePage() {
  const settings = await getSettings();

  const intro = setting(settings, 'donate.intro');
  const bankName = setting(settings, 'donate.bankName', '');
  const accountName = setting(settings, 'donate.bankAccountName', '');
  const accountNumber = setting(settings, 'donate.bankAccountNumber', '');
  const branch = setting(settings, 'donate.bankBranch', '');
  const qrImageUrl = setting(settings, 'donate.qrImageUrl', '');
  const otherMethods = parseLines(setting(settings, 'donate.otherMethods', ''));
  const note = setting(settings, 'donate.note', '');

  const hasBankDetails = [accountName, accountNumber, bankName, branch].some(hasRealValue);
  const hasQr = hasRealValue(qrImageUrl);

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
          WHY GIVE
          ======================================== */}
      <Section>
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-7">
            <SectionHeading
              eyebrow="Your contribution"
              icon="heart"
              title="What your support makes possible"
              description="Every contribution is used to run activities with the community."
            />

            <ul className="space-y-4">
              {[
                {
                  icon: 'book' as const,
                  title: 'Learning and education',
                  text: 'Study support, materials and activities for children and young people.',
                },
                {
                  icon: 'stethoscope' as const,
                  title: 'Health awareness',
                  text: 'Health camps, awareness sessions and community health activities.',
                },
                {
                  icon: 'sparkles' as const,
                  title: 'Women empowerment',
                  text: 'Skills training and livelihood support for women.',
                },
                {
                  icon: 'leaf' as const,
                  title: 'Community development',
                  text: 'Cleanliness, environment and community improvement work.',
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

            <Alert tone="info" className="mt-6">
              <strong>Please read:</strong> this website does not take payments online and does not
              ask for card or wallet details. Contributions are made directly through the channels
              below. If you receive any message claiming to collect money for {orgName} through this
              website, please verify it with our office first.
            </Alert>
          </div>

          {/* ========================================
              HOW TO GIVE (SIDEBAR)
              ======================================== */}
          <aside className="lg:col-span-5">
            <div className="sticky top-24 space-y-6">
              {/* ---------- Bank transfer ---------- */}
              <div className="card p-6">
                <h2 className="flex items-center gap-2 text-base font-bold text-ink-900">
                  <Icon name="banknote" className="h-5 w-5 text-brand-600" />
                  Bank transfer
                </h2>

                {hasBankDetails ? (
                  <dl className="mt-4 space-y-3 text-sm">
                    {hasRealValue(accountName) ? (
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                          Account holder
                        </dt>
                        <dd className="text-ink-800">{accountName}</dd>
                      </div>
                    ) : null}

                    {hasRealValue(accountNumber) ? (
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                          Account number
                        </dt>
                        <dd className="font-mono text-ink-800">{accountNumber}</dd>
                      </div>
                    ) : null}

                    {hasRealValue(bankName) ? (
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                          Bank
                        </dt>
                        <dd className="text-ink-800">{bankName}</dd>
                      </div>
                    ) : null}

                    {hasRealValue(branch) ? (
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                          Branch
                        </dt>
                        <dd className="text-ink-800">{branch}</dd>
                      </div>
                    ) : null}
                  </dl>
                ) : (
                  <p className="mt-3 text-sm text-ink-500">
                    Bank details have not been published yet. An administrator can add them in Admin
                    Panel → Settings → Donation information.
                  </p>
                )}
              </div>

              {/* ---------- QR code ---------- */}
              {hasQr ? (
                <div className="card p-6 text-center">
                  <h2 className="flex items-center justify-center gap-2 text-base font-bold text-ink-900">
                    <Icon name="qr-code" className="h-5 w-5 text-brand-600" />
                    Scan to give
                  </h2>

                  <div className="relative mx-auto mt-4 h-48 w-48 overflow-hidden rounded-card bg-white ring-1 ring-ink-200">
                    <Image
                      src={qrImageUrl}
                      alt="QR code for making a donation"
                      fill
                      sizes="192px"
                      className="object-contain p-2"
                      unoptimized
                    />
                  </div>

                  <p className="mt-3 text-xs text-ink-500">
                    Scan this code with your banking or wallet app.
                  </p>
                </div>
              ) : null}

              {/* ---------- Other ways to give ---------- */}
              {otherMethods.length > 0 ? (
                <div className="card p-6">
                  <h2 className="text-base font-bold text-ink-900">Other ways to give</h2>
                  <ul className="mt-3 space-y-2.5">
                    {otherMethods.map((method) => (
                      <li key={method} className="flex gap-2.5 text-sm text-ink-700">
                        <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                        <span>{method}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {/* ---------- Note + contact ---------- */}
              <div className="card bg-brand-50/60 p-6">
                {note ? <p className="text-sm leading-relaxed text-ink-700">{note}</p> : null}

                <ButtonLink href="/contact" variant="primary" className="mt-4 w-full">
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
            </div>
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
