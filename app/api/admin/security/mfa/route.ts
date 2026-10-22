// ========================================
// API - TWO-STEP VERIFICATION SETUP (per administrator)
// ========================================
// Address: POST /api/admin/security/mfa
//          body: { action: "start" | "confirm" | "disable", code?: "123456" }
//
// WHO MAY CALL IT
//   Any signed-in administrator, for THEIR OWN account only. There is no userId
//   in the request body on purpose: you cannot switch somebody else's two-step
//   verification off through this endpoint, and you cannot read their secret.
//
// THE THREE STEPS
//   start   -> create a fresh secret and return it ONCE, with the otpauth:// link
//              the authenticator app needs. Not active yet.
//   confirm -> check a 6-digit code against that secret. If it is right, the
//              feature switches on (twoFactorEnabledAt).
//   disable -> switch it off. A current code is required, so somebody who finds
//              an unattended logged-in browser cannot quietly remove the second
//              lock.
//
// WHY confirm EXISTS AT ALL
//   Turning it on without proving the app works would lock the administrator out
//   of their own panel at the next sign-in. The code proves the phone and the
//   server agree before the door depends on it.
// ========================================

import { fail, ok, readJson } from '@/lib/api/http';
import { requireAdminApi } from '@/lib/api/guard';
import { prisma } from '@/lib/prisma';
import { writeActivity } from '@/lib/audit';
import { generateSecret, otpauthUrl, verifyCode } from '@/lib/auth/totp';
import { organization } from '@/config/site';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;

  const body = (await readJson(request)) as { action?: unknown; code?: unknown } | null;
  const action = typeof body?.action === 'string' ? body.action : '';
  const code = typeof body?.code === 'string' ? body.code : '';

  const user = await prisma.user.findUnique({
    where: { id: auth.user.id },
    select: { id: true, email: true, name: true, twoFactorEnabledAt: true, twoFactorSecret: true },
  });

  if (!user) return fail('This account no longer exists.', 404);

  // ========================================
  // START - create a secret, do not switch anything on yet
  // ========================================
  if (action === 'start') {
    if (user.twoFactorEnabledAt) {
      return fail(
        'Two-step verification is already on for this account. Turn it off first if you want a new device.',
        409,
      );
    }

    const secret = generateSecret();

    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorSecret: secret, twoFactorEnabledAt: null },
    });

    return ok(
      {
        secret,
        otpauth: otpauthUrl({
          secret,
          account: user.email,
          issuer: organization.shortName ?? organization.name,
        }),
        account: user.email,
      },
      200,
      'Add this key to your authenticator app, then type the 6-digit code it shows.',
    );
  }

  // ========================================
  // CONFIRM - the app and the server agree, so switch it on
  // ========================================
  if (action === 'confirm') {
    if (user.twoFactorEnabledAt) {
      return ok({ enabled: true }, 200, 'Two-step verification is already on.');
    }

    if (!user.twoFactorSecret) {
      return fail('Start the setup again: there is no key waiting to be confirmed.', 409);
    }

    if (!verifyCode(user.twoFactorSecret, code)) {
      return fail('That code is not correct. Check the app and try the current code.', 401, {
        code: 'That code is not correct.',
      });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorEnabledAt: new Date() },
    });

    await writeActivity({
      actorId: user.id,
      actorName: user.name,
      action: 'UPDATE',
      entity: 'Sign-in security',
      entityId: user.id,
      detail: 'Two-step verification turned ON.',
    });

    return ok({ enabled: true }, 200, 'Two-step verification is on. You will be asked for a code at every sign-in.');
  }

  // ========================================
  // DISABLE - needs a current code
  // ========================================
  if (action === 'disable') {
    if (!user.twoFactorEnabledAt) {
      return ok({ enabled: false }, 200, 'Two-step verification is already off.');
    }

    if (!user.twoFactorSecret || !verifyCode(user.twoFactorSecret, code)) {
      return fail(
        'Type a current code from your authenticator app to turn this off.',
        401,
        { code: 'That code is not correct.' },
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorSecret: null, twoFactorEnabledAt: null },
    });

    await writeActivity({
      actorId: user.id,
      actorName: user.name,
      action: 'UPDATE',
      entity: 'Sign-in security',
      entityId: user.id,
      detail: 'Two-step verification turned OFF.',
    });

    return ok({ enabled: false }, 200, 'Two-step verification is off. Your password alone now signs you in.');
  }

  return fail('Choose what to do: start, confirm or disable.', 422);
}
