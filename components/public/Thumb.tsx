// ========================================
// IMAGE HANDLING FOR CARDS
// ========================================
// One small component that draws every picture on the public website.
//
// WHY IT EXISTS
//   - It always keeps the same shape (16:10) so a grid of cards looks tidy,
//     no matter what size the original photo is.
//   - When no picture has been added yet it shows the placeholder image from
//     public/branding/image-placeholder.svg instead of a broken image.
//   - Next.js automatically resizes and compresses the picture, which keeps
//     the website fast on mobile connections.
//
// WHICH IMAGES ARE SHOWN
//   Pictures are added from the Admin Panel. You can either paste a link to
//   an image on the internet, or (when image uploading is configured) upload
//   a file. Nothing is ever copied from another website.
// ========================================

import Image from 'next/image';
import { cn, imageSrc } from '@/lib/utils';

export function Thumb({
  src,
  alt,
  ratio = 'aspect-[16/10]',
  className,
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
  rounded = false,
}: {
  /** The image address from the database. May be empty. */
  src?: string | null;
  /** Description read out by screen readers. Always provide one. */
  alt: string;
  /** Tailwind aspect ratio class controlling the shape. */
  ratio?: string;
  className?: string;
  sizes?: string;
  rounded?: boolean;
}) {
  return (
    <div
      className={cn(
        'relative w-full cursor-zoom-in overflow-hidden bg-ink-100',
        ratio,
        rounded && 'rounded-full',
        className,
      )}
    >
      <Image
        src={imageSrc(src)}
        alt={alt}
        fill
        sizes={sizes}
        // Marks the picture for the full-size viewer (components/public/PhotoZoom).
        data-photo-full={src && src.trim() !== '' ? imageSrc(src) : undefined}
        data-photo-alt={alt}
        className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        // Local placeholder files do not need optimisation.
        unoptimized={imageSrc(src).endsWith('.svg')}
      />
    </div>
  );
}

// ========================================
// CIRCULAR PHOTO (used for people)
// ========================================
export function Avatar({
  src,
  alt,
  size = 80,
  className,
}: {
  src?: string | null;
  alt: string;
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={cn('relative shrink-0 overflow-hidden rounded-full bg-ink-100 ring-2 ring-white', className)}
      style={{ width: size, height: size }}
    >
      <Image
        src={imageSrc(src) === '/branding/image-placeholder.svg' ? '/branding/avatar-placeholder.svg' : imageSrc(src)}
        alt={alt}
        fill
        sizes={`${size}px`}
        className="object-cover"
        unoptimized
      />
    </div>
  );
}
