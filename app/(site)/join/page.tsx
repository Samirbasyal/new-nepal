// ========================================
// JOIN COMMUNITY
// This code controls the Join Community page.
// ========================================
// Address: /join
//
// The form itself is in components/forms/JoinForm.tsx and sends the
// application to POST /api/join, where it is saved in the database and made
// visible ONLY to administrators (Admin Panel -> Join applications).
// ========================================

import type { Metadata } from 'next';
import { JoinForm } from '@/components/forms/JoinForm';
import { Icon } from '@/components/ui/Icon';
import { PageHero, Section } from '@/components/ui/Section';
import { getSettings, setting } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Join our community',
  description:
    'Volunteer with Janakalyan Samataa Yuwa Club. Fill in the form and our team will contact you.',
};

export default async function JoinPage() {
  const settings = await getSettings();
  const intro = setting(settings, 'join.intro');

  return (
    <>
      <PageHero
        eyebrow="Join us"
        icon="user-plus"
        title="Join our community"
        description={intro}
      />

      <Section>
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-14">
          {/* ========================================
              THE FORM
              ======================================== */}
          <div className="lg:col-span-7">
            <JoinForm />
          </div>

          {/* ========================================
              WHY JOIN / WHAT TO EXPECT
              ======================================== */}
          <aside className="lg:col-span-5">
            <div className="space-y-6">
              <div className="card p-6">
                <h2 className="text-base font-bold text-ink-900">Why join us?</h2>
                <ul className="mt-4 space-y-3">
                  {[
                    'Take part in activities that help your own community',
                    'Learn new skills and gain experience',
                    'Work with a team of people who care',
                    'Help decide what the organization does next',
                    'Be part of something that lasts',
                  ].map((item) => (
                    <li key={item} className="flex gap-3 text-sm text-ink-700">
                      <Icon name="check-circle" className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="card p-6">
                <h2 className="text-base font-bold text-ink-900">What happens next?</h2>
                <ol className="mt-4 space-y-4">
                  {[
                    {
                      title: 'You send the form',
                      text: 'Your details are stored securely in our database.',
                    },
                    {
                      title: 'Our team reviews it',
                      text: 'An administrator opens it in the Admin Panel and sets a status.',
                    },
                    {
                      title: 'We contact you',
                      text: 'We will use the phone number or email address you gave us.',
                    },
                  ].map((step, index) => (
                    <li key={step.title} className="flex gap-3">
                      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                        {index + 1}
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-ink-900">
                          {step.title}
                        </span>
                        <span className="block text-xs text-ink-500">{step.text}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="card bg-brand-50/60 p-6">
                <h2 className="flex items-center gap-2 text-base font-bold text-ink-900">
                  <Icon name="shield-check" className="h-5 w-5 text-brand-600" />
                  Your information is safe
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">
                  Your application is stored in our own database and can only be read by signed-in
                  administrators. It is never shown on the public website.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </Section>
    </>
  );
}
