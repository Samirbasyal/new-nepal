import { t } from '@/lib/i18n';
import { getLanguage } from '@/lib/i18n-server';
// ========================================
// ADMIN PANEL - MY NOTES
// ========================================
// Address: /admin/notes
//
// The administrator's own notebook. It is private in the SAME way a member's is:
// the query is filtered by the signed-in administrator's id, so two
// administrators never see each other's notes - not even a Super Administrator.
//
// If the organization ever wants "notes shared with the finance team", that must
// be a separate, clearly labelled table. It is NOT done by opening this one.
// ========================================

import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth/guards';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { NotesPad, type NoteRow } from '@/components/notes/NotesPad';
import { SectionHeading } from '@/components/ui/Section';
import { Alert } from '@/components/ui/Alert';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLanguage();
  return { title: t(lang, 'admin.notes'), robots: { index: false, follow: false } };
}

export default async function AdminNotesPage() {
  const user = await requireAdmin();

  if (!isDatabaseConfigured()) {
    return <Alert tone="warning" title="The database is not set up yet" />;
  }

  const rows = await prisma.personalNote.findMany({
    where: { ownerId: user.id },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, title: true, content: true, createdAt: true, updatedAt: true },
  });

  const notes: NoteRow[] = rows.map((note) => ({
    id: note.id,
    title: note.title,
    content: note.content,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
  }));

  return (
    <div>
      <SectionHeading
        eyebrow="Private"
        icon="file-text"
        title="My notes"
        description="Plans, reminders and things to do tomorrow. Only you can read these notes."
      />

      <NotesPad initialNotes={notes} />
    </div>
  );
}
