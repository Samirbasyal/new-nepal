// ========================================
// BUTTON COMPONENT
// ========================================
// One button used everywhere on the website so every page looks consistent.
//
// HOW TO USE
//   <Button variant="primary">Save</Button>
//   <ButtonLink href="/donate" variant="accent">Donate</ButtonLink>
//
// VARIANTS
//   primary  -> main brand colour button
//   accent   -> the orange "Donate" call-to-action button
//   outline  -> white button with a border
//   ghost    -> text only
//   danger   -> red delete button
//   outline-light -> outlined white button, for dark backgrounds
// ========================================

import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'accent' | 'outline' | 'outline-light' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'btn-primary',
  accent: 'btn-accent',
  outline: 'btn-outline',
  // Used on the dark green hero and footer backgrounds.
  'outline-light': 'btn-outline-light',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: 'btn-sm',
  md: '',
  lg: 'btn-lg',
};

// ========================================
// NORMAL BUTTON (used inside forms)
// ========================================
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
};

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn('btn', VARIANT_CLASS[variant], SIZE_CLASS[size], className)}
      {...rest}
    >
      {children}
    </button>
  );
}

// ========================================
// LINK BUTTON (used for navigation)
// ========================================
type ButtonLinkProps = {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
  /** Open in a new browser tab (used for external links). */
  external?: boolean;
  'aria-label'?: string;
};

export function ButtonLink({
  href,
  variant = 'primary',
  size = 'md',
  className,
  children,
  external = false,
  ...rest
}: ButtonLinkProps) {
  const classes = cn('btn', VARIANT_CLASS[variant], SIZE_CLASS[size], className);

  // External links must be real <a> tags so the browser handles them normally.
  if (external || href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:')) {
    return (
      <a
        href={href}
        className={classes}
        target={href.startsWith('http') ? '_blank' : undefined}
        rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
        {...rest}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={classes} {...rest}>
      {children}
    </Link>
  );
}
