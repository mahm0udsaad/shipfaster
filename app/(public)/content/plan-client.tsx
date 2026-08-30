'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { buildMonthGrid, dayKey, formatTime, isSameDay } from '../../../src/lib/calendar';
import type { PlanPost } from '../../../src/lib/content-plan';

/**
 * The read-only plan viewer.
 *
 * Read-only is the design, not a limitation: there is no database behind this page, so an
 * edit affordance would be a button that cannot work. Everything here is derived from the
 * `posts` prop — the only state is which post is open and which slide of it is showing.
 */

export type PlanPostWithInstant = PlanPost & { scheduledAt: string };

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const STATUS_COLOR: Record<PlanPost['status'], string> = {
  idea: 'var(--color-faint)',
  draft: 'var(--color-pending)',
  scheduled: 'var(--color-agent-2)',
  published: 'var(--color-success)',
};

const CHANNEL_LABEL: Record<PlanPost['channel'], string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
};

/** '/kinbo/tee-mimic-maroon.jpg' → 'tee-mimic-maroon.jpg'. Kept as the download's filename so
 * a saved batch stays recognizable instead of landing as a pile of numbered "image.jpg"s. */
function filenameFor(src: string): string {
  return src.split('/').pop() || 'kinbo-image.jpg';
}

/**
 * A plain `<a href download>` would work for same-origin files like these, but Safari opens
 * the image in a new tab instead of saving it when the link was reached via a click handler
 * rather than direct navigation. Fetching the bytes and downloading the resulting blob saves
 * reliably everywhere, at the cost of holding one image in memory at a time.
 */
async function downloadFile(src: string): Promise<void> {
  const response = await fetch(src);
  if (!response.ok) throw new Error(`Could not download ${src}`);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filenameFor(src);
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function PlanCalendar({
  year,
  month,
  posts,
}: {
  year: number;
  month: number;
  posts: PlanPostWithInstant[];
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  const grid = useMemo(() => buildMonthGrid(year, month), [year, month]);

  // Bucketed in the VIEWER's timezone, matching the rule in src/lib/calendar.ts: a 19:00
  // Cairo slot must land on the day the person reading it would call it.
  const byDay = useMemo(() => {
    const map = new Map<string, PlanPostWithInstant[]>();
    for (const post of posts) {
      const key = dayKey(new Date(post.scheduledAt));
      const bucket = map.get(key);
      if (bucket) bucket.push(post);
      else map.set(key, [post]);
    }
    for (const bucket of map.values()) {
      bucket.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
    }
    return map;
  }, [posts]);

  const inMonthPosts = useMemo(
    () =>
      posts
        .filter((p) => {
          const d = new Date(p.scheduledAt);
          return d.getFullYear() === year && d.getMonth() === month;
        })
        .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)),
    [posts, year, month],
  );

  const open = posts.find((p) => p.id === openId) ?? null;
  const today = new Date();

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-3 text-[11px] text-[var(--color-faint)]">
        {(Object.keys(STATUS_COLOR) as PlanPost['status'][]).map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ background: STATUS_COLOR[s] }} aria-hidden />
            {s}
          </span>
        ))}
      </div>

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

        <div className="grid grid-cols-7">
          {grid.map((day) => {
            const key = dayKey(day);
            const dayPosts = byDay.get(key) ?? [];
            const inMonth = day.getMonth() === month;
            const isToday = isSameDay(day, today);
            return (
              <div
                key={key}
                className={`relative min-h-28 border-b border-r border-[var(--color-line)] p-1.5 ${
                  inMonth ? '' : 'bg-[var(--color-base)]'
                }`}
              >
                <div className="mb-1 px-1">
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
                </div>

                <div className="flex flex-col gap-1">
                  {dayPosts.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setOpenId(p.id)}
                      title={`${formatTime(p.scheduledAt)} · ${p.title}`}
                      className="flex w-full items-center gap-1.5 rounded-md border-l-2 bg-[var(--color-surface-2)] px-1.5 py-1 text-left transition-colors hover:bg-[var(--color-elevated)]"
                      style={{ borderLeftColor: STATUS_COLOR[p.status] }}
                    >
                      <Image
                        src={p.slides[0].src}
                        alt=""
                        width={56}
                        height={56}
                        className="size-7 shrink-0 rounded object-cover"
                      />
                      <span className="min-w-0 flex-1 leading-tight">
                        <span className="block text-[10px] tabular-nums text-[var(--color-faint)]">
                          {formatTime(p.scheduledAt)} · {p.slides.length} slides
                        </span>
                        <span className="block truncate text-[11px] text-[var(--color-ink-2)]" dir="auto">
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

      {/* The grid answers "when"; this answers "what". On a phone the cells are too narrow to
          read a title in, so the list is the primary view there. */}
      {inMonthPosts.length === 0 ? (
        // An empty grid alone reads as a broken page. Say which month has the plan instead.
        <p className="mt-6 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-6 text-center text-[13px] text-[var(--color-muted)]">
          Nothing planned this month — use “Plan month” above to jump back to the plan.
        </p>
      ) : (
        <div className="mt-6">
          <h2 className="mb-3 font-[var(--font-display)] text-[15px] font-bold text-[var(--color-ink)]">
            The posts
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {inMonthPosts.map((p) => (
              <button
                key={p.id}
                onClick={() => setOpenId(p.id)}
                className="overflow-hidden rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] text-left transition-colors hover:border-[var(--color-line-2)] hover:bg-[var(--color-surface-2)]"
              >
                <div className="relative aspect-square">
                  <Image
                    src={p.slides[0].src}
                    alt={p.slides[0].alt}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover"
                  />
                  <span className="absolute bottom-2 right-2 rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-semibold text-white">
                    {p.slides.length} slides
                  </span>
                </div>
                <div className="p-3">
                  <div className="mb-1.5 flex items-center gap-2 text-[11px] text-[var(--color-faint)]">
                    <span
                      className="size-2 rounded-full"
                      style={{ background: STATUS_COLOR[p.status] }}
                      aria-hidden
                    />
                    <span className="tabular-nums">
                      {new Date(p.scheduledAt).toLocaleDateString('en-US', {
                        day: 'numeric',
                        month: 'short',
                      })}{' '}
                      · {formatTime(p.scheduledAt)}
                    </span>
                    <span className="ml-auto">{CHANNEL_LABEL[p.channel]}</span>
                  </div>
                  <p className="text-[13px] font-semibold text-[var(--color-ink)]" dir="auto">
                    {p.title}
                  </p>
                  <p className="mt-1 line-clamp-2 text-[12px] text-[var(--color-muted)]" dir="auto">
                    {p.hook}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {open && <PostDetail post={open} onClose={() => setOpenId(null)} />}
    </>
  );
}

function PostDetail({ post, onClose }: { post: PlanPostWithInstant; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState<'one' | 'all' | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const count = post.slides.length;

  const step = useCallback((delta: number) => setIndex((i) => (i + delta + count) % count), [count]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (count < 2) return;
      if (e.key === 'ArrowLeft') step(-1);
      if (e.key === 'ArrowRight') step(1);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [count, onClose, step]);

  async function copyCaption() {
    try {
      await navigator.clipboard.writeText(post.caption);
      setCopied(true);
      // Reverts on its own: a permanently "Copied" button stops telling you anything.
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* Clipboard blocked (insecure origin, denied permission) — the caption is selectable. */
    }
  }

  // `index` is always in range — `step` wraps and the thumbnails only offer real indices —
  // but slide 1 is a safe resting place if that ever stops being true.
  const slide = post.slides[index] ?? post.slides[0];

  async function downloadCurrent() {
    setDownloadError(null);
    setDownloading('one');
    try {
      await downloadFile(slide.src);
    } catch {
      setDownloadError('Could not download the image.');
    } finally {
      setDownloading(null);
    }
  }

  async function downloadAll() {
    setDownloadError(null);
    setDownloading('all');
    try {
      // Sequential, not Promise.all: a burst of simultaneous downloads is what triggers
      // Chrome's "This site is trying to download multiple files" block after a handful.
      for (const s of post.slides) {
        await downloadFile(s.src);
      }
    } catch {
      setDownloadError('Some images could not be downloaded.');
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-3 sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal
      aria-label={post.title}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[94dvh] w-full max-w-4xl overflow-auto rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)]"
      >
        <div className="flex items-start gap-3 border-b border-[var(--color-line)] p-4">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2 text-[11px] text-[var(--color-faint)]">
              <span
                className="rounded-full px-2 py-0.5 font-semibold text-black"
                style={{ background: STATUS_COLOR[post.status] }}
              >
                {post.status}
              </span>
              <span className="tabular-nums">
                {new Date(post.scheduledAt).toLocaleDateString('en-US', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'long',
                })}{' '}
                · {formatTime(post.scheduledAt)}
              </span>
              <span>· {CHANNEL_LABEL[post.channel]}</span>
            </div>
            <h2
              className="font-[var(--font-display)] text-[17px] font-bold text-[var(--color-ink)]"
              dir="auto"
            >
              {post.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid size-7 shrink-0 place-items-center rounded-lg text-[var(--color-muted)] hover:bg-[var(--color-surface-2)]"
          >
            ✕
          </button>
        </div>

        <div className="grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div>
            <div className="relative aspect-square overflow-hidden rounded-xl bg-[var(--color-base)]">
              <Image
                key={slide.src}
                src={slide.src}
                alt={slide.alt}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
                className="object-cover"
              />
              {count > 1 && (
                <>
                  <CarouselArrow side="left" onClick={() => step(-1)} />
                  <CarouselArrow side="right" onClick={() => step(1)} />
                  <span className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-white">
                    {index + 1} / {count}
                  </span>
                </>
              )}
            </div>

            <p className="mt-2 text-[12px] text-[var(--color-muted)]" dir="auto">
              {slide.alt}
            </p>

            <div className="mt-2 flex flex-wrap gap-2">
              <button
                onClick={downloadCurrent}
                disabled={downloading !== null}
                className="rounded-md border border-[var(--color-line-2)] px-2.5 py-1 text-[12px] font-semibold text-[var(--color-ink-2)] hover:bg-[var(--color-surface-2)] disabled:opacity-50"
              >
                {downloading === 'one' ? 'Downloading…' : 'Download image'}
              </button>
              {count > 1 && (
                <button
                  onClick={downloadAll}
                  disabled={downloading !== null}
                  className="rounded-md border border-[var(--color-line-2)] px-2.5 py-1 text-[12px] font-semibold text-[var(--color-ink-2)] hover:bg-[var(--color-surface-2)] disabled:opacity-50"
                >
                  {downloading === 'all' ? `Downloading… (${count})` : `Download all (${count})`}
                </button>
              )}
            </div>
            {downloadError && (
              <p className="mt-1.5 text-[12px] text-[var(--color-blocked-2)]">{downloadError}</p>
            )}

            {count > 1 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {post.slides.map((s, i) => (
                  <button
                    key={s.src}
                    onClick={() => setIndex(i)}
                    aria-label={`Slide ${i + 1}`}
                    aria-current={i === index}
                    className={`relative size-12 overflow-hidden rounded-lg border-2 transition-colors ${
                      i === index ? 'border-[var(--color-brand)]' : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <Image src={s.src} alt="" fill sizes="48px" className="object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="min-w-0">
            <Meta label="Hook" value={post.hook} />
            <Meta label="Goal" value={post.goal} />
            <Meta label="Format" value={post.format} />
            <Meta label="Platforms" value={post.platforms} />

            <div className="mt-4">
              <div className="mb-1.5 flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-faint)]">
                  Caption
                </span>
                <button
                  onClick={copyCaption}
                  className="rounded-md border border-[var(--color-line-2)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-ink-2)] hover:bg-[var(--color-surface-2)]"
                >
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <p
                dir="rtl"
                className="whitespace-pre-wrap rounded-xl border border-[var(--color-line)] bg-[var(--color-base)] p-3 text-[13px] leading-relaxed text-[var(--color-ink-2)]"
              >
                {post.caption}
              </p>
            </div>

            <Meta label="CTA" value={post.cta} />
            <Meta label="Production notes" value={post.notes} />
          </div>
        </div>
      </div>
    </div>
  );
}

function CarouselArrow({ side, onClick }: { side: 'left' | 'right'; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={side === 'left' ? 'Previous slide' : 'Next slide'}
      className={`absolute top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80 ${
        side === 'left' ? 'left-2' : 'right-2'
      }`}
    >
      {side === 'left' ? '‹' : '›'}
    </button>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-3 first:mt-0">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-faint)]">
        {label}
      </p>
      <p className="text-[13px] leading-relaxed text-[var(--color-ink-2)]" dir="auto">
        {value}
      </p>
    </div>
  );
}
