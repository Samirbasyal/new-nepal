// ========================================
// NOTES PAD
// ========================================
// A private notebook used by BOTH panels:
//   Admin Panel  -> Records & settings -> My notes
//   Member Panel -> My notes
//
// WHAT IT DOES
//   create, edit, save and delete a note; search your own notes as you type;
//   show when each note was written and last changed.
//
// WHERE THE NOTES LIVE
//   In the database (personal_notes), not in the browser. A note therefore
//   survives a refresh, a sign-out and a sign-in on another computer.
//
// PRIVACY
//   The server only ever returns the signed-in person's notes, so this component
//   never receives anybody else's. There is no "share" button on purpose.
//
// SAVING FEEDBACK
//   The button itself says "Saving..." in the orange accent colour while the
//   request is in flight, then "Saved" for a moment.
// ========================================

'use client';

import { useMemo, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';

export type NoteRow = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

type Status = 'idle' | 'saving' | 'saved';

/** "18 Oct 2026, 14:05" */
function formatWhen(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function NotesPad({ initialNotes }: { initialNotes: NoteRow[] }) {
  const [notes, setNotes] = useState<NoteRow[]>(initialNotes);
  const [query, setQuery] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(initialNotes.length === 0);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return notes;
    return notes.filter(
      (note) =>
        note.title.toLowerCase().includes(needle) || note.content.toLowerCase().includes(needle),
    );
  }, [notes, query]);

  function startNew() {
    setEditingId(null);
    setTitle('');
    setContent('');
    setError(null);
    setOpen(true);
  }

  function startEdit(note: NoteRow) {
    setEditingId(note.id);
    setTitle(note.title);
    setContent(note.content);
    setError(null);
    setOpen(true);
    // On a phone the editor is below the list; bring it into view.
    window.setTimeout(() => {
      document.getElementById('note-editor')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
  }

  async function save() {
    if (status === 'saving') return;

    if (title.trim().length === 0) {
      setError('Please give the note a title.');
      return;
    }

    setStatus('saving');
    setError(null);

    try {
      const response = await fetch(editingId ? `/api/notes/${editingId}` : '/api/notes', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), content }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.ok) {
        setError(payload?.error ?? 'The note could not be saved. Please try again.');
        return;
      }

      const saved = payload.data.note as NoteRow;
      setNotes((current) =>
        editingId
          ? current.map((note) => (note.id === saved.id ? saved : note))
          : [saved, ...current],
      );

      setEditingId(null);
      setTitle('');
      setContent('');
      setOpen(false);
      setStatus('saved');
      window.setTimeout(() => setStatus('idle'), 1600);
    } catch {
      setError('The website could not be reached. Please check your connection and try again.');
    } finally {
      setStatus((current) => (current === 'saving' ? 'idle' : current));
    }
  }

  async function remove(note: NoteRow) {
    const sure = window.confirm(`Delete the note "${note.title}"? This cannot be undone.`);
    if (!sure) return;

    setError(null);

    try {
      const response = await fetch(`/api/notes/${note.id}`, { method: 'DELETE' });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.ok) {
        setError(payload?.error ?? 'The note could not be deleted.');
        return;
      }

      setNotes((current) => current.filter((row) => row.id !== note.id));
      if (editingId === note.id) startNew();
    } catch {
      setError('The website could not be reached. Please try again.');
    }
  }

  const saving = status === 'saving';

  return (
    <div className="space-y-5">
      {error ? (
        <div className="rounded-card border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {/* ---------- toolbar ---------- */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Icon
            name="search"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search my notes"
            className="w-full rounded-btn border border-ink-300 bg-white py-2 pl-9 pr-3 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
        </div>

        <div className="flex items-center gap-2">
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="rounded-btn px-3 py-2 text-sm font-medium text-ink-600 hover:bg-ink-100"
            >
              Clear
            </button>
          ) : null}

          <button
            type="button"
            onClick={startNew}
            className="inline-flex items-center gap-2 rounded-btn bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            <Icon name="plus" className="h-4 w-4" />
            New note
          </button>
        </div>
      </div>

      {/* ---------- editor ---------- */}
      {open ? (
        <div id="note-editor" className="card scroll-mt-24 p-5">
          <div className="space-y-3">
            <div>
              <label htmlFor="note-title" className="label">
                Title
              </label>
              <input
                id="note-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={120}
                placeholder="Tomorrow's tasks, meeting notes, a reminder…"
                className="w-full rounded-btn border border-ink-300 bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              />
            </div>

            <div>
              <label htmlFor="note-content" className="label">
                Note
              </label>
              <textarea
                id="note-content"
                value={content}
                onChange={(event) => setContent(event.target.value)}
                rows={7}
                placeholder="Write anything you want to keep. Only you can see it."
                className="w-full rounded-btn border border-ink-300 bg-white px-3 py-2 text-sm leading-relaxed text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className={cn(
                  'inline-flex items-center gap-2 rounded-btn bg-brand-600 px-4 py-2 text-sm font-semibold text-white',
                  saving ? 'cursor-progress opacity-90' : 'hover:bg-brand-700',
                )}
              >
                {saving ? (
                  <span className="inline-flex items-center gap-2 text-accent-100" role="status">
                    <Icon name="refresh" className="h-4 w-4 animate-spin" />
                    Saving…
                  </span>
                ) : (
                  <>
                    <Icon name="check" className="h-4 w-4" />
                    {editingId ? 'Save changes' : 'Save note'}
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setEditingId(null);
                  setTitle('');
                  setContent('');
                }}
                className="rounded-btn px-3 py-2 text-sm font-medium text-ink-600 hover:bg-ink-100"
              >
                Cancel
              </button>

              {status === 'saved' ? (
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-700">
                  <Icon name="check-circle" className="h-4 w-4" />
                  Saved
                </span>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {/* ---------- list ---------- */}
      {visible.length === 0 ? (
        <div className="card p-8 text-center">
          <Icon name="file-text" className="mx-auto h-8 w-8 text-ink-300" />
          <p className="mt-3 font-semibold text-ink-800">
            {query ? 'No note matches that search' : 'You have not written any notes yet'}
          </p>
          <p className="mt-1 text-sm text-ink-500">
            {query
              ? 'Try a different word, or clear the search to see every note.'
              : 'Notes are private to you and are kept in the database, so they are still here after you sign out.'}
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {visible.map((note) => (
            <li key={note.id} className="card flex flex-col p-4">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold text-ink-900">{note.title}</h3>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => startEdit(note)}
                    aria-label={`Edit ${note.title}`}
                    className="rounded-btn p-1.5 text-ink-500 hover:bg-ink-100 hover:text-brand-700"
                  >
                    <Icon name="edit" className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(note)}
                    aria-label={`Delete ${note.title}`}
                    className="rounded-btn p-1.5 text-ink-500 hover:bg-red-50 hover:text-red-600"
                  >
                    <Icon name="trash" className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {note.content ? (
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink-600">
                  {note.content.length > 260 ? `${note.content.slice(0, 260)}…` : note.content}
                </p>
              ) : null}

              <p className="mt-auto pt-3 text-[11px] text-ink-400">
                Written {formatWhen(note.createdAt)}
                {note.updatedAt !== note.createdAt ? ` · changed ${formatWhen(note.updatedAt)}` : ''}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
