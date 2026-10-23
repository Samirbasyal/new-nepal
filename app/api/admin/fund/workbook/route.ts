// ========================================
// API - THE FUND WORKBOOK AS A DOWNLOAD
// ========================================
// Address: GET /api/admin/fund/workbook?year=2082
//
// The file is BUILT HERE, from the rows in the database, at the moment an
// administrator asks for it - so the workbook always matches the fund screens and
// nothing has to be typed twice.
//
// Administrators only: requireAdminApi() reads the session, never the URL.
// ========================================

import { requireAdminApi } from '@/lib/api/guard';
import { fail, serverError } from '@/lib/api/http';
import { isDatabaseConfigured } from '@/lib/prisma';
import { buildFundWorkbook } from '@/lib/fund-workbook';
import { toNepaliDate } from '@/lib/nepali-date';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;

  if (!isDatabaseConfigured()) return fail('The database is not configured.', 503);

  // The year the administrator picked; otherwise the current Bikram Sambat year.
  const current = Number(toNepaliDate(new Date())?.iso.slice(0, 4) ?? '');
  const requested = Number(new URL(request.url).searchParams.get('year'));
  const year = Number.isFinite(requested) && requested >= 2070 && requested <= 2100 ? requested : current;

  try {
    const buffer = await buildFundWorkbook(year);
    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="janakalyan-fund-${year}.xlsx"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return serverError(error, 'The workbook could not be built.');
  }
}
