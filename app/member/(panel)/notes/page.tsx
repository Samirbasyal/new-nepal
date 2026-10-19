// ========================================
// MEMBER PANEL - MY NOTES
// ========================================
// Address: /member/notes
//
// A private notebook. The notes are read here on the SERVER, already filtered by
// the signed-in member's id, so no other person's note can ever reach the page.
// ========================================

import type { Metadata } from 'next';
import { requireMember } from '@/lib/auth/guards';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import { NotesPad, type NoteRow } from '@/components/notes/NotesPad';
import { SectionHeading } from '@/components/ui/Section';
import { Alert } from '@/components/ui/Alert';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'My notes',
  robots: { index: false, follow: false },
};

export default async function MemberNotesPage() {
  const user = await requireMember();

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
        description="Your own notebook for plans, reminders and meeting preparation. Only you can read these notes."
      />

      <NotesPad initialNotes={notes} />
    </div>
  );
}
