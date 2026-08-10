'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import Image from 'next/image';
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
  extractPostCaption,
} from '../../../src/lib/content';
import {
  deleteContentPostAction,
  rescheduleContentPostAction,
  saveContentPostAction,
  uploadContentImageAction,
} from '../../../src/lib/actions/content';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DEFAULT_HOUR = 10;
const CONTENT_IMAGE_ORIGIN = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/$/, '');

const lazyImageCallbacks = new WeakMap<Element, () => void>();
let lazyImageObserver: IntersectionObserver | null = null;
const thumbnailQueue: Array<{
  cancelled: boolean;
  start: (release: () => void) => void;
}> = [];
const MAX_CONCURRENT_THUMBNAILS = 2;
let activeThumbnails = 0;

function drainThumbnailQueue() {
  while (activeThumbnails < MAX_CONCURRENT_THUMBNAILS) {
    const item = thumbnailQueue.shift();
    if (!item) return;
    if (item.cancelled) continue;

    activeThumbnails += 1;
    let released = false;
    item.start(() => {
      if (released) return;
      released = true;
      activeThumbnails -= 1;
      drainThumbnailQueue();
    });
  }
}

function queueThumbnail(start: (release: () => void) => void) {
  const item = { cancelled: false, start };
  thumbnailQueue.push(item);
  drainThumbnailQueue();
  return () => {
    item.cancelled = true;
  };
}

function observeLazyImage(element: Element, reveal: () => void) {
  if (!('IntersectionObserver' in window)) {
    reveal();
    return () => {};
  }

  lazyImageObserver ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        lazyImageCallbacks.get(entry.target)?.();
        lazyImageCallbacks.delete(entry.target);
        lazyImageObserver?.unobserve(entry.target);
      }
    },
    { rootMargin: '160px' },
  );

  lazyImageCallbacks.set(element, reveal);
  lazyImageObserver.observe(element);
  return () => {
    lazyImageCallbacks.delete(element);
    lazyImageObserver?.unobserve(element);
  };
}

function LazyCalendarImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className: string;
}) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const releaseSlotRef = useRef<(() => void) | null>(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const canOptimize =
    CONTENT_IMAGE_ORIGIN.length > 0 && src.startsWith(`${CONTENT_IMAGE_ORIGIN}/storage/`);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let cancelQueued: (() => void) | undefined;
    const stopObserving = observeLazyImage(container, () => {
      cancelQueued = queueThumbnail((release) => {
        releaseSlotRef.current = release;
        setShouldLoad(true);
      });
    });
    return () => {
      stopObserving();
      cancelQueued?.();
      releaseSlotRef.current?.();
      releaseSlotRef.current = null;
    };
  }, [src]);

  function releaseSlot() {
    releaseSlotRef.current?.();
    releaseSlotRef.current = null;
  }

  return (
    <span ref={containerRef} className={`relative block ${className}`}>
      {shouldLoad ? (
        canOptimize ? (
          <Image
            src={src}
            alt={alt}
            fill
            sizes="28px"
            quality={55}
            loading="lazy"
            decoding="async"
            onLoad={releaseSlot}
            onError={releaseSlot}
            className="object-cover"
          />
        ) : (
          // Pasted image URLs can use any host, so keep a native fallback instead of opening
          // Next's optimizer to every remote origin.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={alt}
            width={28}
            height={28}
            loading="lazy"
            decoding="async"
            fetchPriority="low"
            onLoad={releaseSlot}
            onError={releaseSlot}
            className="size-full object-cover"
          />
        )
      ) : null}
    </span>
  );
}

type Draft = {
  id?: string;
  title: string;
  body: string;
  scheduledAt: string;          // datetime-local value (local time)
  projectId: string;
  channel: string;
  status: string;
  imageUrl: string;
  imagePaths: string[];
  previews: string[];           // signed URLs, a pasted URL, or local blob: previews
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
    imagePaths: post.imagePaths,
    previews: post.imageSrcs,
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
    imagePaths: [],
    previews: [],
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
          imagePaths: draft.imagePaths,
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
                style={{ contentVisibility: 'auto', containIntrinsicSize: '112px' }}
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
                        <LazyCalendarImage
                          src={p.imageSrc}
                          alt=""
                          className="size-7 shrink-0 overflow-hidden rounded bg-[var(--color-elevated)]"
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
  setDraft: React.Dispatch<React.SetStateAction<Draft | null>>;
  projects: { id: string; name: string }[];
  busy: boolean;
  error: string | null;
  onSave: () => void;
  onDelete: () => void;
  onClose: () => void;
  onError: (m: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isFullWindow, setIsFullWindow] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const imageCount = draft.previews.length;
  const currentImage = imageCount > 0 ? Math.min(activeImage, imageCount - 1) : 0;
  const caption = extractPostCaption(draft.body);

  useEffect(() => {
    titleRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (isFullWindow) {
          setIsFullWindow(false);
        } else {
          onClose();
        }
      }
      const target = e.target;
      const editing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement;
      if (editing || imageCount < 2) return;
      if (e.key === 'ArrowLeft') setActiveImage((index) => (index - 1 + imageCount) % imageCount);
      if (e.key === 'ArrowRight') setActiveImage((index) => (index + 1) % imageCount);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [imageCount, isFullWindow, onClose]);

  const set = (patch: Partial<Draft>) =>
    setDraft((current) => (current ? { ...current, ...patch } : current));

  async function upload(files: File[]) {
    setUploading(true);
    const uploaded: { path: string; preview: string }[] = [];
    try {
      for (const file of files) {
        const form = new FormData();
        form.set('file', file);
        const { path } = await uploadContentImageAction(form);
        uploaded.push({ path, preview: URL.createObjectURL(file) });
      }
      // The stored objects are private, so newly uploaded files use local blob previews until
      // the page refresh returns signed URLs. Pasting a URL and uploading are mutually exclusive.
      setDraft((current) => {
        if (!current) return current;
        const keepingUploads = current.imagePaths.length > 0;
        return {
          ...current,
          imageUrl: '',
          imagePaths: [
            ...(keepingUploads ? current.imagePaths : []),
            ...uploaded.map((item) => item.path),
          ],
          previews: [
            ...(keepingUploads ? current.previews : []),
            ...uploaded.map((item) => item.preview),
          ],
        };
      });
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  function removeImageAtIndex(targetIndex: number) {
    if (imageCount === 0) return;
    const removedPreview = draft.previews[targetIndex];
    if (removedPreview?.startsWith('blob:')) URL.revokeObjectURL(removedPreview);
    if (draft.imagePaths.length > 0) {
      set({
        imagePaths: draft.imagePaths.filter((_, index) => index !== targetIndex),
        previews: draft.previews.filter((_, index) => index !== targetIndex),
      });
    } else {
      set({ imageUrl: '', previews: [] });
    }
    setActiveImage((index) =>
      Math.max(0, Math.min(index === targetIndex ? 0 : index > targetIndex ? index - 1 : index, imageCount - 2)),
    );
  }

  function removeCurrentImage() {
    removeImageAtIndex(currentImage);
  }

  async function copyCaption() {
    if (!caption) return;
    try {
      await navigator.clipboard.writeText(caption);
      setCopied(true);
    } catch {
      onError('Could not copy the caption');
    }
  }

  async function downloadAll() {
    if (imageCount === 0) return;
    setDownloading(true);
    try {
      const files = await Promise.all(
        draft.previews.map(async (src, index) => {
          const response = await fetch(src);
          if (!response.ok) throw new Error(`Image ${index + 1} could not be downloaded`);
          return { blob: await response.blob(), index };
        }),
      );
      for (const { blob, index } of files) {
        const objectUrl = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = objectUrl;
        anchor.download = `${downloadBaseName(draft.title)}-${String(index + 1).padStart(2, '0')}.${extensionFor(blob.type)}`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(objectUrl);
      }
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Could not download the images');
    } finally {
      setDownloading(false);
    }
  }

  const isPublished = draft.status === 'PUBLISHED';

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
        className="max-h-[92dvh] w-full max-w-3xl overflow-auto rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5"
      >
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-[var(--color-line)] pb-3">
          <div className="flex items-center gap-3">
            <h2 className="font-[var(--font-display)] text-[16px] font-bold text-[var(--color-ink)]">
              {draft.id ? 'Edit post' : 'New post'}
            </h2>
            <button
              onClick={() => set({ status: isPublished ? 'SCHEDULED' : 'PUBLISHED' })}
              type="button"
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold transition-colors ${
                isPublished
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25'
                  : 'bg-[var(--color-surface-2)] text-[var(--color-muted)] border border-[var(--color-line-2)] hover:border-emerald-500/40 hover:text-emerald-400'
              }`}
              title="Click to toggle posted status"
            >
              <span className={`size-2 rounded-full ${isPublished ? 'bg-emerald-400 animate-pulse' : 'bg-gray-400'}`} />
              {isPublished ? '✓ Posted' : 'Mark as Posted'}
            </button>
          </div>
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
        <Block label={`Images${imageCount > 0 ? ` (${imageCount})` : ' (optional)'}`}>
          <div className="overflow-hidden rounded-xl border border-[var(--color-line)] bg-[var(--color-base)]">
            <div className="relative flex min-h-[320px] max-h-[520px] items-center justify-center overflow-hidden bg-black/40 p-2">
              {imageCount > 0 ? (
                <div
                  onClick={() => setIsFullWindow(true)}
                  className="group relative flex max-h-[500px] w-full items-center justify-center cursor-pointer overflow-hidden rounded-lg"
                  title="Click for full window view"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={draft.previews[currentImage]}
                    alt={`${draft.title || 'Post'} creative ${currentImage + 1}`}
                    loading="eager"
                    decoding="async"
                    fetchPriority="high"
                    className="max-h-[490px] w-auto max-w-full rounded-md object-contain shadow-lg transition-transform duration-200 group-hover:scale-[1.01]"
                  />
                  <span className="absolute top-3 right-3 hidden items-center gap-1.5 rounded-lg bg-black/80 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm group-hover:flex">
                    🔍 Full window view
                  </span>
                </div>
              ) : (
                <span className="text-[12px] text-[var(--color-faint)]">No images attached</span>
              )}
              {imageCount > 1 ? (
                <>
                  <button
                    onClick={() => setActiveImage((index) => (index - 1 + imageCount) % imageCount)}
                    aria-label="Previous image"
                    className="absolute left-3 grid size-9 place-items-center rounded-full bg-black/65 text-xl text-white hover:bg-black/80 z-10"
                  >
                    ‹
                  </button>
                  <button
                    onClick={() => setActiveImage((index) => (index + 1) % imageCount)}
                    aria-label="Next image"
                    className="absolute right-3 grid size-9 place-items-center rounded-full bg-black/65 text-xl text-white hover:bg-black/80 z-10"
                  >
                    ›
                  </button>
                  <span className="absolute bottom-3 right-3 rounded-full bg-black/65 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-white z-10">
                    {currentImage + 1} / {imageCount}
                  </span>
                </>
              ) : null}
            </div>

            {imageCount > 0 ? (
              <div className="flex gap-2 overflow-x-auto border-t border-[var(--color-line)] p-2 bg-[var(--color-surface)]">
                {draft.previews.map((src, index) => (
                  <div key={`${src}-${index}`} className="group relative size-14 shrink-0">
                    <button
                      onClick={() => setActiveImage(index)}
                      aria-label={`Show image ${index + 1}`}
                      aria-current={index === currentImage}
                      className={`size-full overflow-hidden rounded-md border-2 transition-all ${
                        index === currentImage
                          ? 'border-[var(--color-brand)] opacity-100 ring-2 ring-[var(--color-brand)]/20'
                          : 'border-transparent opacity-65 hover:opacity-100'
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={src}
                        alt=""
                        width={56}
                        height={56}
                        loading="lazy"
                        decoding="async"
                        fetchPriority="low"
                        className="size-full object-cover"
                      />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImageAtIndex(index);
                      }}
                      aria-label={`Delete image ${index + 1}`}
                      title={`Delete image ${index + 1}`}
                      className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow-md transition-transform hover:bg-red-700 hover:scale-110 z-20"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="rounded-lg border border-[var(--color-line-2)] px-3 py-1.5 text-[12px] font-semibold text-[var(--color-ink-2)] hover:bg-[var(--color-surface-2)] disabled:opacity-50"
            >
              {uploading ? 'Uploading…' : imageCount > 0 ? 'Add images' : 'Upload images'}
            </button>
            {imageCount > 0 ? (
              <>
                <button
                  onClick={() => setIsFullWindow(true)}
                  className="rounded-lg border border-[var(--color-brand)]/50 bg-[var(--color-brand)]/10 px-3 py-1.5 text-[12px] font-semibold text-[var(--color-ink)] hover:bg-[var(--color-brand)]/20"
                >
                  🔍 Full window view
                </button>
                <button
                  onClick={() => void downloadAll()}
                  disabled={downloading}
                  className="rounded-lg border border-[var(--color-line-2)] px-3 py-1.5 text-[12px] font-semibold text-[var(--color-ink-2)] hover:bg-[var(--color-surface-2)] disabled:opacity-50"
                >
                  {downloading ? 'Downloading…' : `Download all (${imageCount})`}
                </button>
                <button
                  onClick={removeCurrentImage}
                  className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-[12px] font-semibold text-red-400 hover:bg-red-500/20"
                >
                  Delete current image
                </button>
              </>
            ) : null}
          </div>

          {isFullWindow && imageCount > 0 && (
            <div
              className="fixed inset-0 z-[100] flex flex-col justify-between bg-black/92 p-4 backdrop-blur-md"
              onClick={() => setIsFullWindow(false)}
              role="dialog"
              aria-modal
              aria-label="Full window image view"
            >
              <div
                className="flex w-full items-center justify-between text-white"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3">
                  <span className="text-[15px] font-bold text-white">
                    {draft.title || 'Post Creative'}
                  </span>
                  <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-semibold tabular-nums text-white">
                    {currentImage + 1} / {imageCount}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => removeImageAtIndex(currentImage)}
                    aria-label="Delete active image"
                    className="flex items-center gap-1 rounded-lg bg-red-600/80 px-3 py-1 text.12px] font-semibold text-white hover:bg-red-600"
                  >
                    🗑 Delete image
                  </button>
                  <button
                    onClick={() => setIsFullWindow(false)}
                    aria-label="Close full window view"
                    className="grid size-9 place-items-center rounded-lg bg-white/10 text-xl font-bold text-white hover:bg-white/25"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div
                className="relative flex flex-1 items-center justify-center p-4 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={draft.previews[currentImage]}
                  alt={`Full view creative ${currentImage + 1}`}
                  className="max-h-[82vh] max-w-[92vw] rounded-lg object-contain shadow-2xl"
                />

                {imageCount > 1 && (
                  <>
                    <button
                      onClick={() => setActiveImage((index) => (index - 1 + imageCount) % imageCount)}
                      aria-label="Previous image"
                      className="absolute left-6 grid size-12 place-items-center rounded-full bg-black/75 text-2xl text-white shadow-xl hover:bg-black"
                    >
                      ‹
                    </button>
                    <button
                      onClick={() => setActiveImage((index) => (index + 1) % imageCount)}
                      aria-label="Next image"
                      className="absolute right-6 grid size-12 place-items-center rounded-full bg-black/75 text-2xl text-white shadow-xl hover:bg-black"
                    >
                      ›
                    </button>
                  </>
                )}
              </div>

              {imageCount > 1 && (
                <div
                  className="flex justify-center gap-2 overflow-x-auto p-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  {draft.previews.map((src, index) => (
                    <button
                      key={`full-${src}-${index}`}
                      onClick={() => setActiveImage(index)}
                      className={`size-14 shrink-0 overflow-hidden rounded-lg border-2 ${
                        index === currentImage
                          ? 'border-[var(--color-brand)]'
                          : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt="" className="size-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            multiple
            hidden
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              if (files.length > 0) void upload(files);
              e.target.value = '';
            }}
          />
          <input
            value={draft.imageUrl}
            onChange={(e) => {
              const imageUrl = e.target.value;
              set({ imageUrl, imagePaths: [], previews: imageUrl ? [imageUrl] : [] });
              setActiveImage(0);
            }}
            placeholder="…or paste one external image URL"
            className={`${inputClass} mt-2`}
          />
        </Block>

        <Block label="Egyptian Caption (Media Buyer Copy)">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-[11px] text-[var(--color-faint)]">
              Clean Egyptian Arabic caption — ready for media buyer to copy.
            </p>
            <button
              onClick={() => void copyCaption()}
              disabled={!caption}
              className="shrink-0 rounded-lg border border-[var(--color-line-2)] px-3 py-1.5 text-[12px] font-semibold text-[var(--color-ink-2)] hover:bg-[var(--color-surface-2)] disabled:opacity-50"
            >
              {copied ? 'Caption copied ✓' : 'Copy caption'}
            </button>
          </div>
          <textarea
            value={draft.body}
            onChange={(e) => set({ body: e.target.value })}
            rows={8}
            placeholder="Caption, hooks, hashtags…"
            className={`${inputClass} resize-y leading-relaxed`}
          />
        </Block>

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

function downloadBaseName(title: string): string {
  const safe = title
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70);
  return safe || 'content-post';
}

function extensionFor(mime: string): string {
  if (mime.includes('jpeg')) return 'jpg';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('gif')) return 'gif';
  return 'png';
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
