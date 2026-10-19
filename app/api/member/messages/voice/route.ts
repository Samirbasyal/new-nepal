// ========================================
// API - SEND A VOICE MESSAGE
// ========================================
// Address: POST /api/member/messages/voice
// Form:    file (audio), duration (seconds)
//
// RULES (checked on the server)
//   - the sender is the signed-in member, never a field in the form
//   - only real audio types are accepted
//   - 4 MB and 3 minutes at most
//   - the file name is regenerated, so a hostile name does nothing
//
// STORAGE
//   Vercel Blob, the same storage the photos already use. Nothing is written to
//   the server disk, which would be lost on the next deploy.
// ========================================

import { fail, ok } from '@/lib/api/http';
import { requireMemberApi } from '@/lib/api/guard';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { isPersistentStorageConfigured } from '@/lib/storage';

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

  const auth = await requireMemberApi(request);
  if (!auth.ok) return auth.response;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail('The recording could not be received. Please try again.', 400);
  }

  const file = form.get('file');
  if (!(file instanceof File)) return fail('No recording was received.', 400);

  const extension = ALLOWED[file.type];
  if (!extension) {
    return fail('Only voice recordings can be sent here.', 400);
  }

  if (file.size > MAX_BYTES) {
    return fail('That recording is larger than 4 MB. Please record a shorter message.', 400);
  }

  const duration = Math.round(Number(form.get('duration') ?? 0));
  if (!Number.isFinite(duration) || duration < 1 || duration > MAX_SECONDS) {
    return fail('A voice message must be between 1 second and 3 minutes.', 400);
  }

  if (!isPersistentStorageConfigured()) {
    return fail(
      'Voice messages need permanent storage. Add BLOB_READ_WRITE_TOKEN to the environment and try again.',
      501,
    );
  }

  try {
    const { put } = await import('@vercel/blob');
    const key = `voice/${auth.user.id.slice(0, 8)}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 10)}.${extension}`;

    const blob = await put(key, Buffer.from(await file.arrayBuffer()), {
      access: 'public',
      contentType: file.type,
      addRandomSuffix: false,
    });

    const message = await prisma.message.create({
      data: {
        threadMemberId: auth.user.id,
        senderId: auth.user.id,
        body: '',
        kind: 'VOICE',
        audioUrl: blob.url,
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

    return ok(
      {
        ...message,
        mine: true,
        senderName: auth.user.name,
        senderRole: auth.user.role,
      },
      201,
      'Voice message sent.',
    );
  } catch (error) {
    console.error('[voice] upload failed:', error);
    return fail('The voice message could not be saved. Please try again.', 500);
  }
}
