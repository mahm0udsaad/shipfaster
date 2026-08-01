/**
 * Proves the content calendar's creative path against the live project, end to end:
 * upload → private bucket → signed URL that loads → delete removes row AND object.
 *
 * Why a script rather than a unit test: the interesting claims here are all about
 * infrastructure the tests deliberately mock away — that the bucket exists, that it is
 * PRIVATE (an unsigned URL must be refused), and that the signature we hand the browser
 * actually resolves. A green test suite says nothing about any of those.
 *
 * It creates one throwaway post and deletes it again; nothing survives a successful run.
 *
 * Run: node --env-file=.env.local --import tsx/esm scripts/verify-content.ts
 */
import { getOwnerContext } from '../src/lib/dashboard';
import {
  createContentPost,
  deleteContentPost,
  listContentPosts,
  signContentImages,
  uploadContentImage,
} from '../src/lib/db/repository';

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

let failures = 0;
function check(label: string, ok: boolean, detail?: unknown) {
  console.log(`${ok ? '✅' : '❌'} ${label}${detail === undefined ? '' : ` — ${detail}`}`);
  if (!ok) failures++;
}

const ctx = await getOwnerContext();

const path = await uploadContentImage(ctx, {
  name: 'probe.png',
  type: 'image/png',
  bytes: PNG.buffer.slice(PNG.byteOffset, PNG.byteOffset + PNG.byteLength) as ArrayBuffer,
});
check('upload lands under the account prefix', path.startsWith(`${ctx.accountId}/`), path);

const at = new Date();
const post = await createContentPost(ctx, {
  title: '[probe] content-calendar verification',
  scheduledAt: at.toISOString(),
  imagePath: path,
  status: 'draft',
});

const window = {
  fromIso: new Date(at.getTime() - 3_600_000).toISOString(),
  toIso: new Date(at.getTime() + 3_600_000).toISOString(),
};
const rows = await listContentPosts(ctx, window);
check('the post reads back through the scoped list', rows.some((r) => r.id === post.id));

const url = signContentImages(rows).then((m) => m.get(path));
const signed = await url;
check('a signed URL is minted for the creative', !!signed);
check('the signed URL loads', (await fetch(signed!)).status === 200);

// The whole point of a private bucket: the same object, unsigned, must be refused.
const bare = `${process.env.SUPABASE_URL}/storage/v1/object/public/content-media/${path}`;
const bareStatus = (await fetch(bare)).status;
check('the same object unsigned is refused', bareStatus === 400 || bareStatus === 404, bareStatus);

await deleteContentPost(ctx, post.id);
const after = await listContentPosts(ctx, window);
check('delete removes the row', !after.some((r) => r.id === post.id));

// Asked of storage, NOT of the signed URL: an already-issued signature keeps serving from
// the CDN cache after the object is gone, so re-fetching it proves nothing either way.
// Signing a path that no longer exists is what actually fails.
const resign = await signContentImages([{ ...rows.find((r) => r.id === post.id)!, id: post.id }]);
check('delete removes the stored object', !resign.has(path));

process.exit(failures === 0 ? 0 : 1);
