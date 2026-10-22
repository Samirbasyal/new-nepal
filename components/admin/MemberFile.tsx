'use client';

// ========================================
// ADMIN - ONE MEMBER'S FILE
// ========================================
// Everything about one member on one screen, in four tabs:
//
//   Responsibilities  permanent duties (no deadline, no expiry)
//   Monthly tasks     this month's work, separate from the duties
//   Performance       the five scores, the overall score and the rank
//   History           who changed which duty, and when
//
// The tabs do not navigate: each one saves through the API and the lists below
// refresh in place, so the administrator never loses their place.
// ========================================

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

type Responsibility = {
  id: string;
  title: string | null;
  description: string;
  isActive: boolean;
  updatedAt: string;
};

type MonthlyTask = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  periodMonth: string | null;
  remarks: string | null;
  completedAt: string | null;
  createdAt: string;
  /** The most recent status change, e.g. "DONE - 22 Oct 2026 by the member". */
  lastUpdate?: string | null;
};

type Evaluation = {
  id: string;
  periodMonth: string;
  workQuality: number | null;
  taskCompletion: number | null;
  participation: number | null;
  responsibility: number | null;
  teamwork: number | null;
  overall: number | null;
  rank: number | null;
  remarks: string | null;
  status: string;
};

type Audit = {
  id: string;
  action: string;
  beforeText: string | null;
  afterText: string | null;
  createdAt: string;
};

type Props = {
  member: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    membershipNo: string | null;
    designation: string | null;
    workingArea: string | null;
    status: string;
    photoUrl: string | null;
    joinedAt: string | null;
  };
  responsibilities: Responsibility[];
  tasks: MonthlyTask[];
  evaluations: Evaluation[];
  audit: Audit[];
  /**
   * Which tab to open first. The member management table links straight to
   * "Responsibilities", "Monthly tasks", "Evaluate" or "History", so the right
   * panel is already open instead of making the administrator click twice.
   */
  initialTab?: string;
};

const TABS = [
  { key: 'duties', label: 'Responsibilities', icon: 'shield' as const },
  { key: 'tasks', label: 'Monthly tasks', icon: 'check-circle' as const },
  { key: 'performance', label: 'Performance', icon: 'chart' as const },
  { key: 'history', label: 'History', icon: 'clock' as const },
];

const STATUS_LABEL: Record<string, string> = {
  TODO: 'Pending',
  IN_PROGRESS: 'In progress',
  DONE: 'Completed',
};

const SCORE_FIELDS = [
  { key: 'workQuality', label: 'Work quality' },
  { key: 'taskCompletion', label: 'Task completion' },
  { key: 'participation', label: 'Participation' },
  { key: 'responsibility', label: 'Responsibility fulfilment' },
  { key: 'teamwork', label: 'Teamwork' },
] as const;

async function callApi(path: string, method: string, body?: unknown) {
  const response = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = (await response.json().catch(() => null)) as
    | { ok: true; data: unknown; message?: string }
    | { ok: false; error: string }
    | null;

  if (!response.ok || !json || json.ok === false) {
    throw new Error((json && 'error' in json && json.error) || 'Could not save. Please try again.');
  }
  return json;
}

export function MemberFile({
  member,
  responsibilities,
  tasks,
  evaluations,
  audit,
  initialTab,
}: Props) {
  const [tab, setTab] = useState(
    initialTab && TABS.some((entry) => entry.key === initialTab) ? initialTab : 'duties',
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // ---- responsibilities ----
  const [duties, setDuties] = useState(responsibilities);
  const [newTitle, setNewTitle] = useState('');
  const [newDuty, setNewDuty] = useState('');
  const [editingDuty, setEditingDuty] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  // ---- monthly tasks ----
  const [taskRows, setTaskRows] = useState(tasks);
  const [taskMonth, setTaskMonth] = useState(
    tasks[0]?.periodMonth ?? new Date().toISOString().slice(0, 7)
  );
  const [taskTitle, setTaskTitle] = useState('');
  const [taskNote, setTaskNote] = useState('');

  // ---- performance ----
  const [months, setMonths] = useState(evaluations);
  const [perfMonth, setPerfMonth] = useState(
    evaluations[0]?.periodMonth ?? new Date().toISOString().slice(0, 7)
  );
  const [scores, setScores] = useState<Record<string, string>>({});
  const [perfRemarks, setPerfRemarks] = useState('');

  // The same equal-weight average the server uses, shown while typing so the
  // administrator sees the number before saving.
  const overallPreview = useMemo(() => {
    const filled = SCORE_FIELDS.map((field) => scores[field.key])
      .filter((value) => value !== undefined && value !== '')
      .map((value) => Number(value))
      .filter((value) => !Number.isNaN(value));

    if (filled.length === 0) return null;
    const average = filled.reduce((sum, value) => sum + value, 0) / filled.length;
    return Math.round(average * 100) / 100;
  }, [scores]);

  async function run(action: () => Promise<void>, successMessage?: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
      if (successMessage) setNotice(successMessage);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  // ---------- duties ----------
  function addDuty() {
    if (!newDuty.trim()) {
      setError('Write the responsibility first.');
      return;
    }
    run(async () => {
      const result = await callApi(`/api/admin/members/${member.id}/responsibilities`, 'POST', {
        title: newTitle,
        description: newDuty,
      });
      const created = (result.data as { responsibility: Responsibility }).responsibility;
      setDuties((rows) => [...rows, created]);
      setNewTitle('');
      setNewDuty('');
    }, 'Responsibility added.');
  }

  function saveDuty(id: string) {
    run(async () => {
      const result = await callApi(`/api/admin/members/${member.id}/responsibilities`, 'PATCH', {
        id,
        description: editText,
      });
      const updated = (result.data as { responsibility: Responsibility }).responsibility;
      setDuties((rows) => rows.map((row) => (row.id === id ? updated : row)));
      setEditingDuty(null);
    }, 'Responsibility updated.');
  }

  function removeDuty(id: string) {
    if (!window.confirm('Remove this responsibility? A copy stays in the history.')) return;
    run(async () => {
      await callApi(`/api/admin/members/${member.id}/responsibilities`, 'DELETE', { id });
      setDuties((rows) => rows.filter((row) => row.id !== id));
    }, 'Responsibility removed.');
  }

  // ---------- tasks ----------
  function addTask() {
    if (!taskTitle.trim()) {
      setError('Give the task a title.');
      return;
    }
    run(async () => {
      const result = await callApi(`/api/admin/members/${member.id}/tasks`, 'POST', {
        title: taskTitle,
        description: taskNote,
        periodMonth: taskMonth,
      });
      const created = (result.data as { task: MonthlyTask }).task;
      setTaskRows((rows) => [created, ...rows]);
      setTaskTitle('');
      setTaskNote('');
    }, 'Task assigned.');
  }

  function setTaskStatus(id: string, status: string) {
    run(async () => {
      const result = await callApi(`/api/admin/members/${member.id}/tasks`, 'PATCH', {
        id,
        status,
      });
      const updated = (result.data as { task: MonthlyTask }).task;
      setTaskRows((rows) => rows.map((row) => (row.id === id ? updated : row)));
    });
  }

  function saveRemarks(id: string, remarks: string) {
    run(async () => {
      const result = await callApi(`/api/admin/members/${member.id}/tasks`, 'PATCH', {
        id,
        remarks,
      });
      const updated = (result.data as { task: MonthlyTask }).task;
      setTaskRows((rows) => rows.map((row) => (row.id === id ? updated : row)));
    }, 'Remarks saved.');
  }

  function removeTask(id: string) {
    if (!window.confirm('Delete this monthly task?')) return;
    run(async () => {
      await callApi(`/api/admin/members/${member.id}/tasks`, 'DELETE', { id });
      setTaskRows((rows) => rows.filter((row) => row.id !== id));
    }, 'Task removed.');
  }

  // ---------- performance ----------
  function savePerformance() {
    const payload: Record<string, unknown> = { periodMonth: perfMonth, remarks: perfRemarks };
    for (const field of SCORE_FIELDS) {
      if (scores[field.key] !== undefined && scores[field.key] !== '') {
        payload[field.key] = Number(scores[field.key]);
      }
    }
    run(async () => {
      const result = await callApi(`/api/admin/members/${member.id}/performance`, 'POST', payload);
      const saved = (result.data as { evaluation: Evaluation }).evaluation;
      setMonths((rows) => [saved, ...rows.filter((row) => row.id !== saved.id)]);
    }, 'Evaluation saved as a draft.');
  }

  function publish() {
    if (!window.confirm('Publish this month? Every member will see their score and rank.')) return;
    run(async () => {
      await callApi(`/api/admin/members/${member.id}/performance`, 'PATCH', {
        periodMonth: perfMonth,
      });
      const refreshed = await callApi(
        `/api/admin/members/${member.id}/performance`,
        'GET'
      );
      setMonths((refreshed.data as { evaluations: Evaluation[] }).evaluations);
    }, 'Results published.');
  }

  return (
    <div className="space-y-5">
      {/* ---------- who this is ---------- */}
      <div className="rounded-2xl border border-ink-200 bg-white p-5">
        <div className="flex flex-wrap items-start gap-4">
          {member.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={member.photoUrl}
              alt={member.name}
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-xl font-bold text-blue-700">
              {member.name.slice(0, 2).toUpperCase()}
            </span>
          )}

          <div className="min-w-0 flex-1">
            <h1 className="font-display text-xl font-bold text-ink-900">{member.name}</h1>
            <p className="mt-0.5 text-sm text-ink-600">
              {member.designation || 'No post set'}
              {member.workingArea ? ` · ${member.workingArea}` : ''}
            </p>
            <p className="mt-1 text-sm text-ink-500">
              {member.email}
              {member.phone ? ` · ${member.phone}` : ''}
              {member.membershipNo ? ` · ID ${member.membershipNo}` : ''}
            </p>
          </div>

          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              member.status === 'ACTIVE'
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-amber-50 text-amber-700'
            }`}
          >
            {member.status}
          </span>
        </div>
      </div>

      {/* ---------- tabs ---------- */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors ${
              tab === item.key
                ? 'bg-blue-600 text-white'
                : 'border border-ink-200 bg-white text-ink-700 hover:bg-ink-50'
            }`}
          >
            <Icon name={item.icon} className="h-4 w-4" />
            {item.label}
          </button>
        ))}
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {notice}
        </p>
      ) : null}

      {/* ================= RESPONSIBILITIES ================= */}
      {tab === 'duties' ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-ink-200 bg-white p-5">
            <h2 className="font-display text-lg font-bold text-ink-900">
              Permanent responsibilities
            </h2>
            <p className="mt-1 text-sm text-ink-500">
              These duties come with the post. They have no deadline and never expire — only you
              can change them.
            </p>

            <div className="mt-4 grid gap-2 sm:grid-cols-[200px_1fr_auto]">
              <input
                value={newTitle}
                onChange={(event) => setNewTitle(event.target.value)}
                placeholder="Heading (optional)"
                className="rounded-lg border border-ink-200 px-3 py-2 text-sm"
              />
              <input
                value={newDuty}
                onChange={(event) => setNewDuty(event.target.value)}
                placeholder="e.g. Keep the cash book up to date"
                className="rounded-lg border border-ink-200 px-3 py-2 text-sm"
              />
              <Button type="button" onClick={addDuty} disabled={busy}>
                Add
              </Button>
            </div>

            <ul className="mt-5 space-y-3">
              {duties.length === 0 ? (
                <li className="rounded-lg border border-dashed border-ink-200 px-4 py-6 text-center text-sm text-ink-500">
                  No responsibilities yet.
                </li>
              ) : null}

              {duties.map((duty) => (
                <li key={duty.id} className="rounded-xl border border-ink-200 p-3">
                  {editingDuty === duty.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={editText}
                        onChange={(event) => setEditText(event.target.value)}
                        rows={2}
                        className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm"
                      />
                      <div className="flex gap-2">
                        <Button type="button" onClick={() => saveDuty(duty.id)} disabled={busy}>
                          Save
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setEditingDuty(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        {duty.title ? (
                          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                            {duty.title}
                          </p>
                        ) : null}
                        <p className="text-sm text-ink-800">{duty.description}</p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingDuty(duty.id);
                            setEditText(duty.description);
                          }}
                          className="rounded-md px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => removeDuty(duty.id)}
                          className="rounded-md px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {/* ================= MONTHLY TASKS ================= */}
      {tab === 'tasks' ? (
        <div className="rounded-2xl border border-ink-200 bg-white p-5">
          <h2 className="font-display text-lg font-bold text-ink-900">Monthly tasks</h2>
          <p className="mt-1 text-sm text-ink-500">
            Work for one month. Separate from the permanent responsibilities above.
          </p>

          <div className="mt-4 grid gap-2 sm:grid-cols-[160px_1fr_1fr_auto]">
            <input
              type="month"
              value={taskMonth}
              onChange={(event) => setTaskMonth(event.target.value)}
              className="rounded-lg border border-ink-200 px-3 py-2 text-sm"
            />
            <input
              value={taskTitle}
              onChange={(event) => setTaskTitle(event.target.value)}
              placeholder="Task title"
              className="rounded-lg border border-ink-200 px-3 py-2 text-sm"
            />
            <input
              value={taskNote}
              onChange={(event) => setTaskNote(event.target.value)}
              placeholder="Instructions (optional)"
              className="rounded-lg border border-ink-200 px-3 py-2 text-sm"
            />
            <Button type="button" onClick={addTask} disabled={busy}>
              Assign
            </Button>
          </div>

          <ul className="mt-5 space-y-3">
            {taskRows.length === 0 ? (
              <li className="rounded-lg border border-dashed border-ink-200 px-4 py-6 text-center text-sm text-ink-500">
                No tasks yet.
              </li>
            ) : null}

            {taskRows.map((task) => (
              <li key={task.id} className="rounded-xl border border-ink-200 p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink-900">{task.title}</p>
                    {task.description ? (
                      <p className="mt-0.5 text-sm text-ink-600">{task.description}</p>
                    ) : null}
                    <p className="mt-1 text-xs text-ink-500">
                      {task.periodMonth ?? 'No month'}
                      {task.completedAt
                        ? ` · finished ${new Date(task.completedAt).toLocaleDateString()}`
                        : ''}
                    </p>
                    {task.lastUpdate ? (
                      <p className="mt-0.5 text-[11px] text-ink-400">
                        Last update: {task.lastUpdate}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={task.status}
                      onChange={(event) => setTaskStatus(task.id, event.target.value)}
                      className="rounded-lg border border-ink-200 px-2 py-1.5 text-xs font-semibold"
                    >
                      {Object.entries(STATUS_LABEL).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => removeTask(task.id)}
                      className="rounded-md px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <RemarksBox
                  value={task.remarks ?? ''}
                  onSave={(value) => saveRemarks(task.id, value)}
                  disabled={busy}
                />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* ================= PERFORMANCE ================= */}
      {tab === 'performance' ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-ink-200 bg-white p-5">
            <h2 className="font-display text-lg font-bold text-ink-900">
              Monthly evaluation
            </h2>
            <p className="mt-1 text-sm text-ink-500">
              Score what was actually done. Leave a box empty if you did not judge it — an empty box
              is not counted as zero.
            </p>

            <div className="mt-4 max-w-xs">
              <label className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                Month
              </label>
              <input
                type="month"
                value={perfMonth}
                onChange={(event) => setPerfMonth(event.target.value)}
                className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm"
              />
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {SCORE_FIELDS.map((field) => (
                <label key={field.key} className="block">
                  <span className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                    {field.label}
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={scores[field.key] ?? ''}
                    onChange={(event) =>
                      setScores((current) => ({ ...current, [field.key]: event.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm"
                  />
                </label>
              ))}
            </div>

            <label className="mt-4 block">
              <span className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                Remarks
              </span>
              <textarea
                value={perfRemarks}
                onChange={(event) => setPerfRemarks(event.target.value)}
                rows={3}
                className="mt-1 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm"
              />
            </label>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800">
                Overall: {overallPreview === null ? '—' : overallPreview}
              </span>
              <Button type="button" onClick={savePerformance} disabled={busy}>
                Save draft
              </Button>
              <Button type="button" variant="outline" onClick={publish} disabled={busy}>
                Publish month
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-ink-200 bg-white p-5">
            <h2 className="font-display text-lg font-bold text-ink-900">Saved months</h2>
            <table className="mt-3 w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-ink-500">
                  <th className="py-2">Month</th>
                  <th className="py-2">Overall</th>
                  <th className="py-2">Rank</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {months.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-ink-500">
                      Nothing saved yet.
                    </td>
                  </tr>
                ) : null}
                {months.map((row) => (
                  <tr key={row.id} className="border-t border-ink-100">
                    <td className="py-2">{row.periodMonth}</td>
                    <td className="py-2">{row.overall ?? '—'}</td>
                    <td className="py-2">{row.rank ?? '—'}</td>
                    <td className="py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          row.status === 'PUBLISHED'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* ================= HISTORY ================= */}
      {tab === 'history' ? (
        <div className="rounded-2xl border border-ink-200 bg-white p-5">
          <h2 className="font-display text-lg font-bold text-ink-900">Responsibility history</h2>
          <p className="mt-1 text-sm text-ink-500">
            Every change to a permanent responsibility, with the words before and after.
          </p>

          <ul className="mt-4 space-y-3">
            {audit.length === 0 ? (
              <li className="rounded-lg border border-dashed border-ink-200 px-4 py-6 text-center text-sm text-ink-500">
                No changes recorded yet.
              </li>
            ) : null}

            {audit.map((row) => (
              <li key={row.id} className="rounded-xl border border-ink-200 p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-ink-900">{row.action}</span>
                  <span className="text-xs text-ink-500">
                    {new Date(row.createdAt).toLocaleString()}
                  </span>
                </div>
                {row.beforeText ? (
                  <p className="mt-1 text-ink-500 line-through">{row.beforeText}</p>
                ) : null}
                {row.afterText ? <p className="mt-1 text-ink-800">{row.afterText}</p> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

// A small remarks box that only saves when the button is pressed, so typing for
// a colleague never overwrites what another administrator is writing.
function RemarksBox({
  value,
  onSave,
  disabled,
}: {
  value: string;
  onSave: (value: string) => void;
  disabled: boolean;
}) {
  const [text, setText] = useState(value);

  return (
    <div className="mt-2 flex gap-2">
      <input
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Remarks for the member"
        className="flex-1 rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs"
      />
      <button
        type="button"
        onClick={() => onSave(text)}
        disabled={disabled}
        className="rounded-md px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50"
      >
        Save
      </button>
    </div>
  );
}
