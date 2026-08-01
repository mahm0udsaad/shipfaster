/**
 * Proves migration 0008 binds: a media buyer's own session token, used directly against
 * PostgREST, reaches the content calendar and nothing else.
 *
 * This deliberately bypasses the Next.js app. Route guards and a filtered sidebar are what
 * the media buyer SEES; this is what stops them reading the books with curl. If this script
 * fails, hiding the Money link is decoration.
 *
 * Run:
 *   MEDIA_BUYER_EMAIL=… MEDIA_BUYER_PASSWORD=… node --env-file=.env.local --import tsx/esm \
 *     scripts/verify-media-buyer.ts
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!;
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const email = process.env.MEDIA_BUYER_EMAIL;
const password = process.env.MEDIA_BUYER_PASSWORD;

if (!email || !password) {
  console.error('Set MEDIA_BUYER_EMAIL and MEDIA_BUYER_PASSWORD in the environment.');
  process.exit(1);
}

let failures = 0;
function check(label: string, ok: boolean, detail?: unknown) {
  console.log(`${ok ? '✅' : '❌'} ${label}${detail === undefined ? '' : ` — ${detail}`}`);
  if (!ok) failures++;
}

const supabase = createClient(url, publishable, { auth: { persistSession: false } });
const { data: auth, error: authError } = await supabase.auth.signInWithPassword({
  email,
  password,
});
if (authError) throw authError;
check('the media buyer can sign in', !!auth.session);

// ---------- what they MUST reach ----------
const projects = await supabase.from('projects').select('id, name');
check('reads projects (needed to label and filter posts)', !projects.error && (projects.data?.length ?? 0) > 0, projects.error?.message);

const slot = new Date(Date.now() + 86_400_000).toISOString();
const accountId = (projects.data?.[0] as { account_id?: string })?.account_id;
const insert = await supabase
  .from('content_posts')
  .insert({
    account_id: accountId ?? (await supabase.from('accounts').select('id').limit(1)).data?.[0]?.id,
    title: '[probe] media buyer write',
    scheduled_at: slot,
    status: 'draft',
  })
  .select()
  .single();
check('can schedule content', !insert.error, insert.error?.message);

const posts = await supabase.from('content_posts').select('id, title');
check('can read the calendar back', !posts.error && (posts.data?.length ?? 0) > 0, posts.error?.message);

// ---------- what they must NOT reach ----------
// RLS filters rather than errors: a refused SELECT comes back as zero rows, which is why
// each of these asserts emptiness rather than an error code.
for (const table of ['milestones', 'tasks', 'clients', 'agents', 'approvals', 'session_logs']) {
  const res = await supabase.from(table).select('*');
  check(`cannot read ${table}`, (res.data?.length ?? 0) === 0, `${res.data?.length ?? 0} rows`);
}

const write = await supabase
  .from('milestones')
  .insert({ project_id: projects.data?.[0]?.id, title: '[probe] should fail', amount: 1 });
check('cannot write a milestone', !!write.error, write.error?.code ?? 'no error returned');

// ---------- cleanup ----------
if (insert.data?.id) {
  const del = await supabase.from('content_posts').delete().eq('id', insert.data.id);
  check('can delete their own post (cleanup)', !del.error, del.error?.message);
}

await supabase.auth.signOut();
process.exit(failures === 0 ? 0 : 1);
