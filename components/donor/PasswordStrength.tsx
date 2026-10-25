// ========================================
// PASSWORD STRENGTH - A HINT, NOT A GATE
// ========================================
// The only hard rules are the ones the server enforces (lib/donor/schemas.ts):
// eight characters, at least one letter, at least one number. Anything stricter
// shown here would be a lie, because a password that passes the meter but fails
// the server is worse than no meter at all.
//
// So this bar scores what is actually there - length, mixed case, digits,
// symbols - and never blocks the submit button. It exists to nudge somebody from
// "samir123" towards something they would not regret.
//
// WHY THE SCORE IS COMPUTED IN THE BROWSER ONLY
//   The password never leaves this component. No request is made, nothing is
//   stored, and the value is not copied into any state that outlives the field.
// ========================================

'use client';

const LEVELS = [
  { label: 'Too short', bar: 'bg-red-500', width: 'w-1/5', text: 'text-red-300' },
  { label: 'Weak', bar: 'bg-orange-500', width: 'w-2/5', text: 'text-orange-300' },
  { label: 'Fair', bar: 'bg-amber-400', width: 'w-3/5', text: 'text-amber-200' },
  { label: 'Good', bar: 'bg-purple-400', width: 'w-4/5', text: 'text-purple-200' },
  { label: 'Strong', bar: 'bg-emerald-400', width: 'w-full', text: 'text-emerald-300' },
] as const;

export function scorePassword(value: string): number {
  if (value.length === 0) return 0;

  let score = 0;
  if (value.length >= 8) score += 1;
  if (value.length >= 12) score += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
  if (/[0-9]/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;

  // A long password made of one repeated character or a straight run is not
  // strong, however many boxes it ticks.
  if (/^(.)\1+$/.test(value) || /^(0123|1234|abcd|qwer|password)/i.test(value)) {
    return Math.min(score, 1);
  }

  return Math.min(score, 4);
}

export function PasswordStrength({ value }: { value: string }) {
  if (value.length === 0) return null;

  const level = LEVELS[scorePassword(value)] ?? LEVELS[0];
  const meetsServerRule = value.length >= 8 && /[A-Za-z]/.test(value) && /[0-9]/.test(value);

  return (
    <div className="mt-2" aria-live="polite">
      <div className="flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full rounded-full transition-all duration-300 ${level.bar} ${level.width}`}
          />
        </div>
        <span className={`text-[11px] font-semibold ${level.text}`}>{level.label}</span>
      </div>

      <p className="mt-1 text-[11px] text-purple-200/60">
        {meetsServerRule
          ? 'This meets the requirement. Longer and more varied is better.'
          : 'At least 8 characters, with a letter and a number.'}
      </p>
    </div>
  );
}
