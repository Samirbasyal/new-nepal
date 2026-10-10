// ========================================
// API - MEMBER PANEL: UPDATE MY OWN PROFILE
// ========================================
// Address: POST /api/member/profile
//
// A signed-in member can change these details about themselves:
//   name, phone, address, short introduction, photo link
//
// ITEM THAT ARE DELIBERATELY NOT ACCEPTED HERE
//   email      -> identifies the account; only an administrator can change it
//   role       -> only an administrator can promote somebody to ADMIN
//   status     -> membership status is decided by the organization
//   isActive   -> only an administrator can switch an account on or off
//
// The update is scoped to the member's OWN record (id comes from the signed
// session cookie, never from the request), so a member can never edit another
// member's profile.
// ========================================

import { requireMemberApi } from '@/lib/api/guard';
import { fail, ok, readJson, zodFieldErrors, zodMessage } from '@/lib/api/http';
import { writeActivity } from '@/lib/audit';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { profileUpdateSchema } from '@/lib/validation/schemas';

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return fail('The website database has not been connected yet.', 503);
  }

  // ---------- Authorization: must be signed in ----------
  const auth = await requireMemberApi(request);
  if (!auth.ok) return auth.response;

  const body = await readJson(request);
  if (!body) return fail('The form could not be read. Please try again.', 400);

  const parsed = profileUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return fail(zodMessage(parsed.error.issues), 422, zodFieldErrors(parsed.error.issues));
  }

  const { name, phone, address, bio, photoUrl } = parsed.data;

  try {
    // The "where" clause uses the id FROM THE SESSION, never from the form.
    const updated = await prisma.user.update({
      where: { id: auth.user.id },
      data: {
        name,
        phone: phone ?? null,
        profile: {
          upsert: {
            create: {
              address: address ?? null,
              bio: bio ?? null,
              photoUrl: photoUrl ?? null,
            },
            update: {
              address: address ?? null,
              bio: bio ?? null,
              photoUrl: photoUrl ?? null,
            },
          },
        },
      },
      select: { id: true, name: true, phone: true, profile: true },
    });

    await writeActivity({
      actorId: auth.user.id,
      actorName: auth.user.name,
      action: 'UPDATE',
      entity: 'Own profile',
      entityId: auth.user.id,
      detail: auth.user.email,
    });

    return ok(updated, 200, 'Your profile has been updated.');
  } catch (error) {
    console.error('[member/profile] update failed:', error);
    return fail('Could not save your profile. Please try again.', 500);
  }
}

// ========================================
// GET - READ MY OWN PROFILE
// ========================================
export async function GET(request: Request) {
  const auth = await requireMemberApi(request);
  if (!auth.ok) return auth.response;

  const profile = await prisma.user.findUnique({
    where: { id: auth.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      lastLoginAt: true,
      createdAt: true,
      // The password hash is NEVER selected, so it can never leak.
      profile: true,
    },
  });

  if (!profile) return fail('Account not found.', 404);
  return ok(profile);
}
