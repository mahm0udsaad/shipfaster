'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  buildMonthGrid,
  dayKey,
  formatTime,
  fromLocalInputValue,
  isSameDay,
  monthKey,
  moveToDay,
  toLocalInputValue,
} from '../../../src/lib/calendar';
import {
  CHANNELS,
  CHANNEL_LABEL,
  STATUSES,
  STATUS_COLOR,
  type CalendarPost,
} from '../../../src/lib/content';
import {
  deleteContentPostAction,
  rescheduleContentPostAction,
  saveContentPostAction,
  uploadContentImageAction,
} from '../../../src/lib/actions/content';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DEFAULT_HOUR = 10;

type Draft = {
  id?: string;
  title: string;
  body: string;
  scheduledAt: string;          // datetime-local value (local time)
  projectId: string;
  channel: string;
  status: string;
  imageUrl: string;
  imagePath: string;
  preview: string | null;       // what the composer shows: signed URL, pasted URL, or blob:
};

function draftFor(post: CalendarPost): Draft {
  return {
    id: post.id,
    title: post.title,
    body: post.body ?? '',
    scheduledAt: toLocalInputValue(post.scheduledAt),
    projectId: post.projectId ?? '',
    channel: post.channel,
    status: post.status,
    imageUrl: post.imageUrl ?? '',
    imagePath: post.imagePath ?? '',
    preview: post.imageSrc,
  };
}

function emptyDraft(day: Date): Draft {
  const at = new Date(day.getFullYear(), day.getMonth(), day.getDate(), DEFAULT_HOUR, 0);
  return {
    title: '',
    body: '',
    scheduledAt: toLocalInputValue(at.toISOString()),
    projectId: '',
    channel: 'instagram',
    status: 'scheduled',
    imageUrl: '',
    imagePath: '',
    preview: null,
  };
}

export function ContentCalendar({
  year,
  month,
  posts,
  projects,
  activeProjectId,
}: {
  year: number;
  month: number;
  posts: CalendarPost[];
  projects: { id: string; name: string }[];
  activeProjectId: string;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overKey, setOverKey] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const grid = useMemo(() => buildMonthGrid(year, month), [year, month]);

  // Bucketed in the browser's timezone — a 23:00 post belongs to the day the viewer sees.
  const byDay = useMemo(() => {
    const map = new Map<string, CalendarPost[]>();
    for (const p of posts) {
      const key = dayKey(new Date(p.scheduledAt));
      const list = map.get(key) ?? [];
      list.push(p);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
    }
    return map;
  }, [posts]);

  const today = new Date();

  function run(fn: () => Promise<unknown>, after?: () => void) {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
        after?.();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong');
      }
    });
  }

  function save() {
    if (!draft) return;
    run(
      () =>
        saveContentPostAction({
          id: draft.id,
          title: draft.title,
          body: draft.body,
          scheduledAt: fromLocalInputValue(draft.scheduledAt),
          projectId: draft.projectId || null,
          channel: draft.channel,
          status: draft.status,
          imageUrl: draft.imageUrl || null,
          imagePath: draft.imagePath || null,
        }),
      () => setDraft(null),
    );
  }

  function remove() {
    if (!draft?.id) return;
    run(() => deleteContentPostAction(draft.id!), () => setDraft(null));
  }

  function drop(day: Date) {
    const post = posts.find((p) => p.id === dragId);
    setDragId(null);
    setOverKey(null);
    if (!post || isSameDay(new Date(post.scheduledAt), day)) return;
    run(() => rescheduleContentPostAction(post.id, moveToDay(post.scheduledAt, day)));
  }

  function filterProject(id: string) {
    const base = `/content?m=${monthKey(year, month)}`;
    router.push(id ? `${base}&project=${id}` : base);
  }

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select
          value={activeProjectId}
          onChange={(e) => filterProject(e.target.value)}
          className="h-8 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-2 text-[13px] text-[var(--color-ink-2)]"
        >
          <option value="">All projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <div className="ml-auto flex items-center gap-3">
          <div className="hidden items-center gap-3 text-[11px] text-[var(--color-faint)] sm:flex">
            {STATUSES.map((s) => (
              <span key={s} className="flex items-center gap-1.5">
                <span
                  className="size-2 rounded-full"
                  style={{ background: STATUS_COLOR[s] }}
                  aria-hidden
                />
                {s}
              </span>
            ))}
          </div>
          <button
            onClick={() => setDraft(emptyDraft(new Date()))}
            className="rounded-lg bg-[var(--color-brand)] px-3 py-1.5 text-[13px] font-semibold text-black"
          >
            + New post
          </button>
        </div>
      </div>

      {error && !draft && (
        <p className="mb-3 rounded-lg border border-[var(--color-blocked)]/40 bg-[var(--color-blocked)]/[0.08] px-3 py-2 text-[13px] text-[var(--color-blocked-2)]">
          {error}
        </p>
      )}

      <div className="overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)]">
        <div className="grid grid-cols-7 border-b border-[var(--color-line)]">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-faint)]"
            >
              {d}
            </div>
          ))}
        </div>

        <div className={`grid grid-cols-7 ${pending ? 'opacity-60' : ''}`}>
          {grid.map((day) => {
            const key = dayKey(day);
            const dayPosts = byDay.get(key) ?? [];
            const inMonth = day.getMonth() === month;
            const isToday = isSameDay(day, today);
            return (
              <div
                key={key}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOverKey(key);
                }}
                onDragLeave={() => setOverKey((k) => (k === key ? null : k))}
                onDrop={() => drop(day)}
                className={`group relative min-h-28 border-b border-r border-[var(--color-line)] p-1.5 transition-colors ${
                  // Solid token, not an opacity blend: `--color-base` at 40% reads as a heavy
                  // grey block in the light theme instead of a recessed cell.
                  inMonth ? '' : 'bg-[var(--color-base)]'
                } ${overKey === key ? 'bg-[var(--color-agent)]/10' : ''}`}
              >
                <div className="mb-1 flex items-center justify-between px-1">
                  <span
                    className={`grid size-5 place-items-center rounded-full text-[11px] ${
                      isToday
                        ? 'bg-[var(--color-brand)] font-bold text-black'
                        : inMonth
                          ? 'text-[var(--color-muted)]'
                          : 'text-[var(--color-faint)]'
                    }`}
                  >
                    {day.getDate()}
                  </span>
                  <button
                    onClick={() => setDraft(emptyDraft(day))}
                    aria-label={`Add post on ${key}`}
                    className="hidden size-5 place-items-center rounded text-[13px] text-[var(--color-faint)] hover:bg-[var(--color-elevated)] hover:text-[var(--color-ink)] group-hover:grid"
                  >
                    +
                  </button>
                </div>

                <div className="flex flex-col gap-1">
                  {dayPosts.map((p) => (
                    <button
                      key={p.id}
                      draggable
                      onDragStart={(e) => {
                        // Which post is moving is tracked in React state; the payload exists
                        // because Firefox refuses to start a drag with an empty dataTransfer.
                        e.dataTransfer.setData('text/plain', p.id);
                        e.dataTransfer.effectAllowed = 'move';
                        setDragId(p.id);
                      }}
                      onDragEnd={() => setDragId(null)}
                      onClick={() => setDraft(draftFor(p))}
                      title={`${formatTime(p.scheduledAt)} · ${p.title}`}
                      className={`flex w-full items-center gap-1.5 rounded-md border-l-2 bg-[var(--color-surface-2)] px-1.5 py-1 text-left transition-colors hover:bg-[var(--color-elevated)] ${
                        dragId === p.id ? 'opacity-40' : ''
                      }`}
                      style={{ borderLeftColor: STATUS_COLOR[p.status] ?? 'var(--color-line-2)' }}
                    >
                      {p.imageSrc ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.imageSrc}
                          alt=""
                          className="size-7 shrink-0 rounded object-cover"
                        />
                      ) : null}
                      {/* Time above title rather than beside it: a day cell is ~180px wide, and
                          sharing that row left the title truncated to a few characters. */}
                      <span className="min-w-0 flex-1 leading-tight">
                        <span className="block text-[10px] tabular-nums text-[var(--color-faint)]">
                          {formatTime(p.scheduledAt)}
                          {p.projectName ? ` · ${p.projectName}` : ''}
                        </span>
                        <span className="block truncate text-[11px] text-[var(--color-ink-2)]">
                          {p.title}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {draft && (
        <Composer
          draft={draft}
          setDraft={setDraft}
          projects={projects}
          busy={pending}
          error={error}
          onSave={save}
          onDelete={remove}
          onClose={() => {
            setDraft(null);
            setError(null);
          }}
          onError={setError}
        />
      )}
    </>
  );
}

function Composer({
  draft,
  setDraft,
  projects,
  busy,
  error,
  onSave,
  onDelete,
  onClose,
  onError,
}: {
  draft: Draft;
  setDraft: (d: Draft) => void;
  projects: { id: string; name: string }[];
  busy: boolean;
  error: string | null;
  onSave: () => void;
  onDelete: () => void;
  onClose: () => void;
  onError: (m: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const set = (patch: Partial<Draft>) => setDraft({ ...draft, ...patch });

  async function upload(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.set('file', file);
      const { path } = await uploadContentImageAction(form);
      // Preview from the local file: the stored object is private, and its signed URL only
      // comes back with the next page render.
      set({ imagePath: path, imageUrl: '', preview: URL.createObjectURL(file) });
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal
      aria-label={draft.id ? 'Edit post' : 'New post'}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90dvh] w-full max-w-lg overflow-auto rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-[var(--font-display)] text-[16px] font-bold text-[var(--color-ink)]">
            {draft.id ? 'Edit post' : 'New post'}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid size-7 place-items-center rounded-lg text-[var(--color-muted)] hover:bg-[var(--color-surface-2)]"
          >
            ✕
          </button>
        </div>

        <Field label="Title">
          <input
            ref={titleRef}
            value={draft.title}
            onChange={(e) => set({ title: e.target.value })}
            placeholder="Ramadan teaser — reel 1"
            className={inputClass}
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Date & time">
            <input
              type="datetime-local"
              value={draft.scheduledAt}
              onChange={(e) => set({ scheduledAt: e.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label="Project">
            <select
              value={draft.projectId}
              onChange={(e) => set({ projectId: e.target.value })}
              className={inputClass}
            >
              <option value="">No project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Channel">
            <select
              value={draft.channel}
              onChange={(e) => set({ channel: e.target.value })}
              className={inputClass}
            >
              {CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {CHANNEL_LABEL[c]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select
              value={draft.status}
              onChange={(e) => set({ status: e.target.value })}
              className={inputClass}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {/* Not a <label>: it contains buttons, and a button inside a label fights the label's
            own click behaviour. */}
        <Block label="Image (optional)">
          <div className="flex items-start gap-3">
            <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-lg border border-dashed border-[var(--color-line-2)] bg-[var(--color-base)]">
              {draft.preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={draft.preview} alt="" className="size-full object-cover" />
              ) : (
                <span className="text-[11px] text-[var(--color-faint)]">none</span>
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="flex gap-2">
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="rounded-lg border border-[var(--color-line-2)] px-3 py-1.5 text-[12px] font-semibold text-[var(--color-ink-2)] hover:bg-[var(--color-surface-2)] disabled:opacity-50"
                >
                  {uploading ? 'Uploading…' : 'Upload'}
                </button>
                {draft.preview && (
                  <button
                    onClick={() => set({ imagePath: '', imageUrl: '', preview: null })}
                    className="rounded-lg border border-[var(--color-line-2)] px-3 py-1.5 text-[12px] text-[var(--color-muted)] hover:bg-[var(--color-surface-2)]"
                  >
                    Remove
                  </button>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void upload(f);
                  e.target.value = '';
                }}
              />
              <input
                value={draft.imageUrl}
                onChange={(e) =>
                  set({ imageUrl: e.target.value, imagePath: '', preview: e.target.value || null })
                }
                placeholder="…or paste an image URL"
                className={inputClass}
              />
            </div>
          </div>
        </Block>

        <Field label="Content">
          <textarea
            value={draft.body}
            onChange={(e) => set({ body: e.target.value })}
            rows={5}
            placeholder="Caption, hooks, hashtags…"
            className={`${inputClass} resize-y leading-relaxed`}
          />
        </Field>

        {error && (
          <p className="mb-3 text-[12px] text-[var(--color-blocked-2)]" role="alert">
            {error}
          </p>
        )}

        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={onSave}
            disabled={busy || uploading || !draft.title.trim()}
            className="rounded-lg bg-[var(--color-brand)] px-4 py-2 text-[13px] font-semibold text-black disabled:opacity-50"
          >
            {draft.id ? 'Save' : 'Schedule'}
          </button>
          <button
            onClick={onClose}
            className="rounded-lg border border-[var(--color-line-2)] px-4 py-2 text-[13px] font-semibold text-[var(--color-ink-2)] hover:bg-[var(--color-surface-2)]"
          >
            Cancel
          </button>
          {draft.id && (
            <button
              onClick={onDelete}
              disabled={busy}
              className="ml-auto rounded-lg px-3 py-2 text-[13px] font-semibold text-[var(--color-blocked-2)] hover:bg-[var(--color-blocked)]/10 disabled:opacity-50"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const inputClass =
  'w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-base)] px-3 py-2 text-[13px] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-faint)] focus:border-[var(--color-agent)]';

const fieldLabelClass =
  'mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[var(--color-faint)]';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mb-3 block">
      <span className={fieldLabelClass}>{label}</span>
      {children}
    </label>
  );
}

/** Field's shape without the <label> wrapper, for groups that contain their own controls. */
function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <span className={fieldLabelClass}>{label}</span>
      {children}
    </div>
  );
}
