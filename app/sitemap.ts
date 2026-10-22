// ========================================
// SITEMAP (FOR SEARCH ENGINES)
// ========================================
// A sitemap is a list of every page on the website. Search engines such as
// Google read it to discover your pages.
//
// It is generated automatically from the database, so new programs, projects,
// events and news articles are included without any work.
//
// The result is available at:  https://your-address/sitemap.xml
//
// PRIVATE PAGES ARE DELIBERATELY EXCLUDED:
//   /admin/...  /member/...  /unauthorized  /api/...
// ========================================

import type { MetadataRoute } from 'next';
import { getEvents, getNewsPosts, getPrograms, getProjects } from '@/lib/data/public';

// Generate the sitemap fresh on every request, because it depends on the database.
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  // ---------- 1. The fixed pages ----------
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${baseUrl}/about`, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${baseUrl}/programs`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/projects`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/our-works`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/impact`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/beneficiaries`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/women-empowered`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/events`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/news`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/gallery`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/members`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/donors`, changeFrequency: 'monthly', priority: 0.6 },
      { url: `${baseUrl}/donate`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/contact`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/privacy`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/terms`, changeFrequency: 'yearly', priority: 0.3 },
  ];

  // ---------- 2. The pages that come from the database ----------
  try {
    const [programs, projects, events, news] = await Promise.all([
      getPrograms({ pageSize: 500 }),
      getProjects({ pageSize: 500 }),
      getEvents({ pageSize: 500 }),
      getNewsPosts({ pageSize: 500 }),
    ]);

    const programPages: MetadataRoute.Sitemap = programs.rows.map((program) => ({
      url: `${baseUrl}/programs/${program.slug}`,
      lastModified: program.updatedAt,
      changeFrequency: 'monthly',
      priority: 0.7,
    }));

    const projectPages: MetadataRoute.Sitemap = projects.rows.map((project) => ({
      // "WORK" entries live under /our-works, everything else under /projects.
      url: `${baseUrl}${project.kind === 'WORK' ? '/our-works' : '/projects'}/${project.slug}`,
      lastModified: project.updatedAt,
      changeFrequency: 'monthly',
      priority: 0.7,
    }));

    const eventPages: MetadataRoute.Sitemap = events.rows.map((event) => ({
      url: `${baseUrl}/events/${event.slug}`,
      lastModified: event.updatedAt,
      changeFrequency: 'weekly',
      priority: 0.6,
    }));

    const newsPages: MetadataRoute.Sitemap = news.rows.map((post) => ({
      url: `${baseUrl}/news/${post.slug}`,
      lastModified: post.updatedAt,
      changeFrequency: 'monthly',
      priority: 0.7,
    }));

    return [...staticPages, ...programPages, ...projectPages, ...eventPages, ...newsPages];
  } catch (error) {
    // If the database is not ready yet we still return the fixed pages, so the
    // sitemap never breaks the build or the deployment.
    console.error('[sitemap] could not read content pages:', error);
    return staticPages;
  }
}
