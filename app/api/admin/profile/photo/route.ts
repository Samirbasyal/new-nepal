// ========================================
// API - THE ADMINISTRATOR'S OWN PICTURE
// ========================================
// POST   /api/admin/profile/photo   (multipart, field "photo")
// DELETE /api/admin/profile/photo
//
// Any signed-in administrator, for THEIR OWN account: the row that changes comes
// from the session, never from the request body.
// ========================================

import { requireAdminApi } from '@/lib/api/guard';
import { fail, ok, serverError } from '@/lib/api/http';
import { prisma } from '@/lib/prisma';
import { storeImage } from '@/lib/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail('The picture could not be read. Please choose the file again.', 400);
  }

  const file = form.get('photo');
  if (!(file instanceof File) || file.size === 0) {
    return fail('Please choose a picture first.', 422);
  }

  try {
    const stored = await storeImage(file, 'photo');
    await prisma.user.update({ where: { id: auth.user.id }, data: { photoUrl: stored.url } });
    return ok({ url: stored.url }, 200, 'Your picture has been saved.');
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message) return fail(message, 400);
    return serverError(error, 'The picture could not be saved. Please try again.');
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;

  await prisma.user.update({ where: { id: auth.user.id }, data: { photoUrl: null } });
  return ok({ url: null }, 200, 'Your picture has been removed.');
}
