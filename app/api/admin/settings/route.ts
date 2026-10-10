// ========================================
// API - ADMIN PANEL: WEBSITE SETTINGS
// ========================================
// Addresses:
//   GET  /api/admin/settings   -> read every editable setting
//   POST /api/admin/settings   -> save the settings form
//
// This is what lets the organization change its own phone number, address,
// bank details and homepage text WITHOUT editing any code.
//
// Notice that the list of allowed keys comes from lib/settings.ts
// (SETTING_DEFINITIONS). Any unknown key sent to this endpoint is ignored, so
// the settings table cannot be filled with junk.
// ========================================

import { fail, ok, readJson, zodMessage } from '@/lib/api/http';
import { requireAdminApi } from '@/lib/api/guard';
import { writeActivity } from '@/lib/audit';
import { prisma } from '@/lib/prisma';
import { SETTING_DEFINITIONS, getSettings } from '@/lib/settings';
import { settingsUpdateSchema } from '@/lib/validation/schemas';

// ========================================
// GET - READ ALL SETTINGS (with the current saved values)
// ========================================
export async function GET(request: Request) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;

  const current = await getSettings();

  return ok({
    // The definition list tells the Admin Panel which fields to draw.
    definitions: SETTING_DEFINITIONS,
    values: current,
  });
}

// ========================================
// POST - SAVE SETTINGS
// ========================================
export async function POST(request: Request) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;

  const body = await readJson(request);
  if (!body) return fail('The form could not be read. Please try again.', 400);

  const parsed = settingsUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return fail(zodMessage(parsed.error.issues), 422);
  }

  // Only keys we know about may be saved.
  const allowedKeys = new Set(SETTING_DEFINITIONS.map((definition) => definition.key));
  const entries = Object.entries(parsed.data.values).filter(([key]) => allowedKeys.has(key));

  if (entries.length === 0) {
    return fail('There was nothing to save.', 400);
  }

  try {
    // upsert = update the row when the key already exists, otherwise create it.
    await Promise.all(
      entries.map(([key, value]) =>
        prisma.siteSetting.upsert({
          where: { key },
          update: { value: String(value ?? '') },
          create: {
            key,
            value: String(value ?? ''),
            group: SETTING_DEFINITIONS.find((d) => d.key === key)?.group ?? 'GENERAL',
          },
        }),
      ),
    );

    await writeActivity({
      actorId: auth.user.id,
      actorName: auth.user.name,
      action: 'SETTINGS',
      entity: 'Website settings',
      detail: `${entries.length} value(s) updated`,
    });

    return ok({ saved: entries.length }, 200, 'Settings saved successfully.');
  } catch (error) {
    console.error('[settings] could not save:', error);
    return fail('Could not save the settings. Please try again.', 500);
  }
}
