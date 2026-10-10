// ========================================
// API - CONTACT FORM
// ========================================
// Address: POST /api/contact   (public - no login needed)
//
// Receives the contact form, validates it and stores it in the
// "contact_messages" table.
//
// Administrators read the messages in Admin Panel -> Contact messages.
//
// NOTE ABOUT E-MAIL
//   This project does NOT send e-mail by itself, so the form does not promise
//   an automatic reply. If you would like notification e-mails, add your
//   e-mail service (for example Resend or SendGrid) in the marked place below.
// ========================================

import { blockMessage, blockedForMinutes, clientKey, recordFailure, recordSuccess } from '@/lib/auth/rate-limit';
import { fail, ok, readJson, zodFieldErrors, zodMessage } from '@/lib/api/http';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { contactMessageSchema } from '@/lib/validation/schemas';
import { getSettings, setting } from '@/lib/settings';

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return fail('The website database has not been connected yet.', 503);
  }

  const ip = clientKey(request);
  const blockedFor = blockedForMinutes(`contact:${ip}`);
  if (blockedFor > 0) {
    return fail(blockMessage(blockedFor), 429);
  }

  const body = await readJson(request);
  if (!body) return fail('The form could not be read. Please try again.', 400);

  const parsed = contactMessageSchema.safeParse(body);
  if (!parsed.success) {
    return fail(zodMessage(parsed.error.issues), 422, zodFieldErrors(parsed.error.issues));
  }

  const data = parsed.data;

  // ---------- Honeypot check (see the note in app/api/join/route.ts) ----------
  if (data.website && data.website.trim() !== '') {
    recordFailure(`contact:${ip}`);
    return ok({ saved: false }, 200, 'Thank you. Your message has been received.');
  }

  try {
    const message = await prisma.contactMessage.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone ?? null,
        subject: data.subject ?? null,
        message: data.message,
        status: 'NEW',
      },
      select: { id: true },
    });

    recordSuccess(`contact:${ip}`);

    await prisma.activityLog
      .create({
        data: {
          action: 'CREATE',
          entity: 'Contact message',
          entityId: message.id,
          detail: `${data.name} - ${data.subject || 'No subject'}`,
        },
      })
      .catch(() => undefined);

    // ========================================
    // OPTIONAL: SEND A NOTIFICATION E-MAIL HERE
    // ========================================
    // If you want the office to receive an e-mail for every message, install
    // an e-mail service and send it from here, for example:
    //
    //   const settings = await getSettings();
    //   const officeEmail = setting(settings, 'contact.email');
    //   await myEmailService.send({ to: officeEmail, subject: ..., text: ... });
    //
    // Never put the e-mail service API key in the code - use .env.
    // ========================================
    const settings = await getSettings();
    const officeEmail = setting(settings, 'contact.email');
    void officeEmail; // currently only used to document where it belongs

    return ok(
      { id: message.id },
      201,
      'Thank you for getting in touch. Our team will reply as soon as possible.',
    );
  } catch (error) {
    console.error('[contact] could not save message:', error);
    recordFailure(`contact:${ip}`);
    return fail('We could not send your message right now. Please try again shortly.', 500);
  }
}
