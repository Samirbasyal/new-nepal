// ========================================
// SMALLER PUBLIC CARDS
// ========================================
// This file holds the remaining card designs used across the website.
// Each one has its own clearly marked block below:
//   1. EVENT CARD
//   2. NEWS / NOTICE CARD
//   3. DONOR CARD
//   4. MEMBER / LEADERSHIP CARD
//   5. BENEFICIARY CARD
//   6. GALLERY ALBUM CARD
// ========================================

import Link from 'next/link';
import Image from 'next/image';
import { Icon, iconFromKey } from '@/components/ui/Icon';
import { StatusBadge } from '@/components/ui/Badge';
import { Thumb, Avatar } from '@/components/public/Thumb';
import { formatDate, formatNumber, truncate } from '@/lib/utils';

// ========================================
// 1. EVENTS SECTION
// This code controls the event cards on /events and the homepage.
// ========================================
export type EventCardData = {
  slug: string;
  title: string;
  summary?: string | null;
  description?: string | null;
  startsAt: Date | string;
  location?: string | null;
  status?: string | null;
  imageUrl?: string | null;
};

export function EventCard({ event }: { event: EventCardData }) {
  const date = new Date(event.startsAt);
  const day = Number.isNaN(date.getTime()) ? '' : date.getDate();
  const month = Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString('en-GB', { month: 'short' });
  const year = Number.isNaN(date.getTime()) ? '' : date.getFullYear();

  return (
    <article className="card card-hover group flex h-full flex-col overflow-hidden">
      <div className="relative">
        <Link href={`/events/${event.slug}`} tabIndex={-1} aria-hidden="true">
          <Thumb src={event.imageUrl} alt={event.title} />
        </Link>

        {/* Date badge on top of the picture */}
        {day ? (
          <div className="absolute left-4 top-4 flex h-16 w-16 flex-col items-center justify-center rounded-card bg-white/95 shadow-md backdrop-blur">
            <span className="text-xl font-bold leading-none text-brand-700">{day}</span>
            <span className="text-xs font-semibold uppercase text-ink-600">{month}</span>
            <span className="text-[10px] text-ink-500">{year}</span>
          </div>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <StatusBadge status={event.status} className="mb-3 self-start" />

        <h3 className="text-lg font-bold leading-snug text-ink-900">
          <Link href={`/events/${event.slug}`} className="hover:text-brand-700">
            {event.title}
          </Link>
        </h3>

        <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-600">
          {event.summary || truncate(event.description ?? '', 130) || 'Details will be added soon.'}
        </p>

        {event.location ? (
          <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-ink-500">
            <Icon name="map-pin" className="h-3.5 w-3.5" />
            {event.location}
          </p>
        ) : null}
      </div>
    </article>
  );
}

// ========================================
// 2. NEWS / NOTICES
// This code controls the article cards on /news and the homepage.
// ========================================
export type NewsCardData = {
  slug: string;
  title: string;
  type?: string | null;
  category?: string | null;
  excerpt?: string | null;
  content?: string | null;
  coverImageUrl?: string | null;
  publishedAt?: Date | null;
};

export function NewsCard({ post }: { post: NewsCardData }) {
  return (
    <article className="card card-hover group flex h-full flex-col overflow-hidden">
      <Link href={`/news/${post.slug}`} tabIndex={-1} aria-hidden="true">
        <Thumb src={post.coverImageUrl} alt={post.title} />
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <StatusBadge status={post.type} />
          {post.category ? (
            <span className="text-xs font-medium text-ink-500">{post.category}</span>
          ) : null}
        </div>

        <h3 className="text-lg font-bold leading-snug text-ink-900">
          <Link href={`/news/${post.slug}`} className="hover:text-brand-700">
            {post.title}
          </Link>
        </h3>

        <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-600">
          {post.excerpt || truncate(post.content ?? '', 140) || 'Read the full article for details.'}
        </p>

        {post.publishedAt ? (
          <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-ink-500">
            <Icon name="calendar" className="h-3.5 w-3.5" />
            {formatDate(post.publishedAt)}
          </p>
        ) : null}
      </div>
    </article>
  );
}

// ========================================
// 3. DONOR SECTION
// This code controls the donor cards on /donors.
// Only donors marked as public by an administrator are ever shown.
// ========================================
export type DonorCardData = {
  name: string;
  organization?: string | null;
  logoUrl?: string | null;
  description?: string | null;
  supportArea?: string | null;
  websiteUrl?: string | null;
};

export function DonorCard({ donor }: { donor: DonorCardData }) {
  const title = donor.organization || donor.name;

  return (
    <article className="card card-hover flex h-full flex-col items-start p-5">
      {/* Donor logo (falls back to the placeholder picture) */}
      <div className="relative mb-4 h-16 w-full max-w-[10rem]">
        <Image
          src={donor.logoUrl?.trim() ? donor.logoUrl : '/branding/image-placeholder.svg'}
          alt={`${title} logo`}
          fill
          sizes="160px"
          className="object-contain object-left"
          unoptimized
        />
      </div>

      <h3 className="text-base font-bold text-ink-900">{title}</h3>

      {donor.organization && donor.name ? (
        <p className="text-xs text-ink-500">Contact: {donor.name}</p>
      ) : null}

      {donor.supportArea ? (
        <span className="mt-2 inline-flex items-center rounded-full bg-accent-50 px-2.5 py-1 text-xs font-semibold text-accent-700 ring-1 ring-inset ring-accent-200">
          {donor.supportArea}
        </span>
      ) : null}

      {donor.description ? (
        <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-600">{donor.description}</p>
      ) : null}

      {donor.websiteUrl ? (
        <a
          href={donor.websiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline"
        >
          Visit website
          <Icon name="external-link" className="h-4 w-4" />
        </a>
      ) : null}
    </article>
  );
}

// ========================================
// 4. MEMBERS / LEADERSHIP
// This code controls the people cards on /members.
// Only "public" members are shown, and only non-sensitive information.
// ========================================
export type MemberCardData = {
  id: string;
  designation?: string | null;
  department?: string | null;
  bio?: string | null;
  photoUrl?: string | null;
  user: { name: string };
};

export function MemberCard({ member }: { member: MemberCardData }) {
  return (
    <article className="card card-hover flex h-full flex-col items-center p-6 text-center">
      <Avatar src={member.photoUrl} alt={`Portrait of ${member.user.name}`} size={96} />

      <h3 className="mt-4 text-base font-bold text-ink-900">{member.user.name}</h3>

      {member.designation ? (
        <p className="mt-0.5 text-sm font-semibold text-brand-700">{member.designation}</p>
      ) : null}

      {member.department ? (
        <p className="text-xs text-ink-500">{member.department}</p>
      ) : null}

      {member.bio ? (
        <p className="mt-3 text-sm leading-relaxed text-ink-600">{member.bio}</p>
      ) : null}
    </article>
  );
}

// ========================================
// 5. BENEFICIARIES SECTION
// This code controls the "who we serve" cards on /beneficiaries.
// A number is only shown when the organization has entered a real one.
// ========================================
export type BeneficiaryCardData = {
  slug: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  iconKey?: string | null;
  beneficiaryCount?: number | null;
  countLabel?: string | null;
};

export function BeneficiaryCard({ category }: { category: BeneficiaryCardData }) {
  return (
    <article className="card card-hover flex h-full flex-col p-6">
      <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-card bg-brand-50 text-brand-600 ring-1 ring-brand-100">
        <Icon name={iconFromKey(category.iconKey)} className="h-6 w-6" />
      </span>

      <h3 className="text-base font-bold text-ink-900">{category.name}</h3>

      {category.description ? (
        <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-600">{category.description}</p>
      ) : null}

      {/*
        The number block only appears when a real figure has been entered in
        the Admin Panel. We never invent statistics.
      */}
      {typeof category.beneficiaryCount === 'number' ? (
        <p className="mt-4 border-t border-ink-100 pt-4">
          <span className="block text-2xl font-bold text-brand-700">
            {formatNumber(category.beneficiaryCount)}
          </span>
          <span className="text-xs text-ink-500">
            {category.countLabel || 'people supported'}
          </span>
        </p>
      ) : null}
    </article>
  );
}

// ========================================
// 6. GALLERY SECTION
// This code controls the album cards on /gallery.
// ========================================
export type AlbumCardData = {
  slug: string;
  title: string;
  description?: string | null;
  coverImageUrl?: string | null;
  eventDate?: Date | null;
  images?: { imageUrl: string }[];
  _count?: { images: number };
};

export function AlbumCard({ album }: { album: AlbumCardData }) {
  // Use the album cover, or the first photo inside the album.
  const cover = album.coverImageUrl || album.images?.[0]?.imageUrl || null;
  const count = album._count?.images ?? album.images?.length ?? 0;

  return (
    <article className="card card-hover group flex h-full flex-col overflow-hidden">
      <div className="relative">
        <Thumb src={cover} alt={album.title} />
        {count > 0 ? (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
            <Icon name="image" className="h-3.5 w-3.5" />
            {count}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-base font-bold text-ink-900">{album.title}</h3>

        {album.description ? (
          <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-600">
            {truncate(album.description, 120)}
          </p>
        ) : null}

        {album.eventDate ? (
          <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-ink-500">
            <Icon name="calendar" className="h-3.5 w-3.5" />
            {formatDate(album.eventDate)}
          </p>
        ) : null}
      </div>
    </article>
  );
}
