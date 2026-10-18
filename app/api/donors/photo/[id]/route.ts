// ========================================
// API - ONE DONOR'S PHOTO, WITH THE PRIVACY CHECK
// ========================================
// Address: GET /api/donors/photo/<donor id>
//
// WHY THE PHOTO IS NOT LINKED DIRECTLY
//   A supporter's picture lives in file storage under a long address. Printing
//   that address in the public HTML would mean that anybody who saw the page -
//   or a search engine that cached it - could keep loading the picture after the
//   donor was switched back to Private.
//
//   So the gallery points at this route instead. It looks the donor up, decides,
//   and only then hands the browser the file. Switch a donor to Private and the
//   same address stops answering for the public at once.
//
// WHO MAY SEE WHAT
//   Public + active donor   anyone gets the picture (that is the point of Public)
//   Private or inactive     only a signed-in administrator, and even then only
//                           inside the panel; everybody else is told 404, not 403,
//                           so the address does not confirm that a person exists.
// ========================================

import { NextResponse } from 'next/server';
import { isAdminRole } from '@/lib/constants';
import { getSession } from '@/lib/auth/session';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!isDatabaseConfigured()) {
    return new NextResponse('Not found', { status: 404 });
  }

  const donor = await prisma.donor
    .findUnique({
      where: { id },
      select: { logoUrl: true, isPublic: true, isActive: true },
    })
    .catch(() => null);

  if (!donor || !donor.logoUrl) {
    return new NextResponse('Not found', { status: 404 });
  }

  const isPubliclyVisible = donor.isPublic && donor.isActive;

  // ---------- privacy check ----------
  if (!isPubliclyVisible) {
    const session = await getSession().catch(() => null);

    if (!session || !isAdminRole(session.user.role)) {
      // Deliberately the same answer as "no such photo".
      return new NextResponse('Not found', { status: 404 });
    }
  }

  // ---------- hand over the file ----------
  // A public donor's picture may be served straight from the storage CDN; the
  // browser is sent there and caches it. A private one is never cached, because
  // it may be switched off again at any moment.
  return NextResponse.redirect(donor.logoUrl, {
    status: 302,
    headers: {
      'cache-control': isPubliclyVisible
        ? 'public, max-age=300, stale-while-revalidate=86400'
        : 'no-store',
    },
  });
}
