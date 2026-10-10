// ========================================
// IMPACT / STATISTICS SECTION
// ========================================
// Shows the organization's real numbers.
//
// VERY IMPORTANT - NO INVENTED STATISTICS
//   The four number slots (impact.value1 ... impact.value4) are EMPTY when
//   the project is installed. While a slot is empty NOTHING is displayed -
//   no "0", no made-up figure.
//
//   Fill them in from: Admin Panel -> Settings -> "Impact numbers"
//   and only with numbers the organization can stand behind.
//
// The "hasRealValue" check from lib/settings.ts also ignores values that
// still contain the shipped "[Add ...]" placeholder text.
// ========================================

import { Icon } from '@/components/ui/Icon';
import { Section, SectionHeading, CardGrid } from '@/components/ui/Section';
import { getSettings, hasRealValue, setting } from '@/lib/settings';

export async function StatGrid({
  title = 'Our impact',
  description,
  showHeading = true,
}: {
  title?: string;
  description?: string;
  showHeading?: boolean;
}) {
  const settings = await getSettings();

  // Build the list of number slots and keep only the ones that actually
  // contain a real value.
  const stats = [1, 2, 3, 4]
    .map((index) => ({
      value: setting(settings, `impact.value${index}`, ''),
      label: setting(settings, `impact.label${index}`, ''),
    }))
    .filter((item) => hasRealValue(item.value));

  // Nothing to show yet -> render nothing at all (this is intentional).
  if (stats.length === 0) return null;

  return (
    <Section muted>
      {showHeading ? (
        <SectionHeading
          eyebrow="Our impact"
          icon="chart"
          title={title}
          description={description}
          align="center"
        />
      ) : null}

      <CardGrid columns={stats.length >= 4 ? 4 : stats.length === 3 ? 3 : 2}>
        {stats.map((stat) => (
          <div key={stat.label + stat.value} className="card p-6 text-center">
            <p className="font-display text-3xl font-bold text-brand-700 sm:text-4xl">
              {stat.value}
            </p>
            <p className="mt-2 text-sm font-medium text-ink-600">{stat.label}</p>
          </div>
        ))}
      </CardGrid>

      <p className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-ink-500">
        <Icon name="info" className="h-3.5 w-3.5" />
        Figures are entered by the organization and can be updated any time from the Admin Panel.
      </p>
    </Section>
  );
}
