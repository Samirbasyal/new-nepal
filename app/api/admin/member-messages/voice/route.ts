// ========================================
// API - ADMIN SENDS A VOICE REPLY
// ========================================
// Address: POST /api/admin/member-messages/voice
// Form:    memberId (the conversation), file (audio), duration (seconds)
//
// The message lands in that member's thread exactly like a typed reply, so it
// appears in their panel within a few seconds and they are notified.
//
// Only an administrator may call this; the sender is always the signed-in
// administrator, never a field in the form.
// ========================================

import { fail, ok } from '@/lib/api/http';
import { requireAdminApi } from '@/lib/api/guard';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { notifyUser } from '@/lib/notifications';
import { isPersistentStorageConfigured, privateBlobWriteOptions, urlForKey } from '@/lib/storage';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const MAX_BYTES = 4 * 1024 * 1024;
const MAX_SECONDS = 180;

const ALLOWED: Record<string, string> = {
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/mp4': 'm4a',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
};

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) return fail('The database is not set up yet.', 503);

  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail('The recording could not be received. Please try again.', 400);
  }

  const memberId = String(form.get('memberId') ?? '').trim();
  const file = form.get('file');
  const duration = Math.round(Number(form.get('duration') ?? 0));

  if (!memberId) return fail('Please choose a member first.', 422);
  if (!(file instanceof File)) return fail('No recording was received.', 400);

  const extension = ALLOWED[file.type];
  if (!extension) return fail('Only voice recordings can be sent here.', 400);
  if (file.size > MAX_BYTES) {
    return fail('That recording is larger than 4 MB. Please record a shorter message.', 400);
  }
  if (!Number.isFinite(duration) || duration < 1 || duration > MAX_SECONDS) {
    return fail('A voice message must be between 1 second and 3 minutes.', 400);
  }

  const member = await prisma.user.findUnique({
    where: { id: memberId },
    select: { id: true, name: true },
  });

  if (!member) return fail('That member could not be found.', 404);

  if (!isPersistentStorageConfigured()) {
    return fail(
      'Voice messages need permanent storage. Add BLOB_READ_WRITE_TOKEN to the environment and try again.',
      501,
    );
  }

  try {
    const { put } = await import('@vercel/blob');
    const key = `voice/admin-${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${extension}`;

    const blob = await put(key, Buffer.from(await file.arrayBuffer()), {
      // PRIVATE store: a voice message belongs to one member and the office.
      // Vercel refuses to hand the file to anybody who does not hold the token,
      // so the address cannot be opened by sharing a link.
      ...privateBlobWriteOptions(),
      contentType: file.type,
      addRandomSuffix: false,
    });

    const created = await prisma.message.create({
      data: {
        threadMemberId: member.id,
        senderId: auth.user.id,
        recipientId: member.id,
        body: '',
        kind: 'VOICE',
        // The guarded /api/files/... address, not the raw blob URL: playback is
        // checked against the signed-in person first.
        audioUrl: urlForKey(key) ?? blob.url,
        audioDuration: duration,
      },
      select: {
        id: true,
        subject: true,
        body: true,
        kind: true,
        audioUrl: true,
        audioDuration: true,
        readAt: true,
        createdAt: true,
      },
    });

    await notifyUser({ userId: member.id,
      title: 'Voice message from the office',
      message: `${auth.user.name} sent you a voice message.`,
      type: 'INFO',
      link: '/member/messages',
    });

    return ok(
      {
        ...created,
        mine: true,
        senderName: auth.user.name,
        senderRole: auth.user.role,
      },
      201,
      'Voice reply sent.',
    );
  } catch (error) {
    console.error('[admin-voice] upload failed:', error);
    return fail('The voice message could not be saved. Please try again.', 500);
  }
}
