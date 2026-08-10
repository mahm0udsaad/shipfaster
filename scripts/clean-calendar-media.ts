/**
 * Cleans and filters calendar post media & content text across the database.
 * 
 * 1. Replaces cut-in-half/buggy 627x1254 images (corex-tee.png & newcast-tee.png) with fixed 1254x1254 square images.
 * 2. Filters out ultra-wide banners (banner.jpg) and logo clutter from product carousels.
 * 3. Ensures post bodies contain clean Egyptian Arabic captions for media buyers to copy instantly.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { getOwnerContext } from '../src/lib/dashboard';
import {
  listContentPosts,
  updateContentPost,
  uploadContentImage,
  decodeContentImagePaths,
  encodeContentImagePaths,
} from '../src/lib/db/repository';

const IMAGE_ROOT = '/Users/mahmoudmac/Documents/marketing';

async function main() {
  const ctx = await getOwnerContext();
  const posts = await listContentPosts(ctx, { fromIso: '2026-08-01T00:00:00.000Z', toIso: '2026-09-01T00:00:00.000Z' });

  console.log(`Auditing ${posts.length} posts for buggy images & text...`);

  // Ensure fixed images exist in marketing folder
  const corexFixedLocal = 'kinbo-website/public/images/products/corex-tee-clean.png';
  const newcastFixedLocal = 'kinbo-website/public/images/products/newcast-tee-clean.png';

  // Upload fixed images if needed
  async function uploadFile(relPath: string) {
    const fullPath = path.join(IMAGE_ROOT, relPath);
    const bytes = await fs.readFile(fullPath);
    const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    return uploadContentImage(ctx, {
      name: path.basename(fullPath),
      type: 'image/png',
      bytes: arrayBuffer,
    });
  }

  const fixedCorexPath = await uploadFile(corexFixedLocal);
  const fixedNewcastPath = await uploadFile(newcastFixedLocal);

  let updatedCount = 0;

  for (const post of posts) {
    const currentPaths = decodeContentImagePaths(post.image_path);
    let modified = false;
    let newPaths: string[] = [];

    for (const p of currentPaths) {
      if (p.includes('corex-tee.png') && !p.includes('corex-tee-clean')) {
        newPaths.push(fixedCorexPath);
        modified = true;
      } else if (p.includes('newcast-tee.png') && !p.includes('newcast-tee-clean')) {
        newPaths.push(fixedNewcastPath);
        modified = true;
      } else if (p.includes('banner.jpg') && post.title.includes('القاهرة والجيزة')) {
        // Remove banner.jpg from local discovery Reel to keep post clean
        modified = true;
      } else if (p.includes('logo.jpg') && currentPaths.length > 2 && !post.title.includes('Highlights')) {
        // Remove logo clutter from pure product carousels
        modified = true;
      } else {
        newPaths.push(p);
      }
    }

    // Deduplicate
    newPaths = Array.from(new Set(newPaths));

    // Ensure body is clean caption without any extra English strategy tags
    let cleanBody = post.body?.trim() ?? '';
    // Strip any accidental prefix/suffix strategy headings if present
    cleanBody = cleanBody.replace(/^الكابشن المقترح:\s*/i, '').trim();

    if (modified || cleanBody !== post.body) {
      await updateContentPost(
        ctx,
        post.id,
        {
          project_id: post.project_id,
          title: post.title,
          body: cleanBody,
          channel: post.channel,
          status: post.status,
          scheduled_at: post.scheduled_at,
          image_path: encodeContentImagePaths(newPaths),
          image_url: null,
        },
        'Filtered buggy images and cleaned caption for media buyers',
      );
      updatedCount++;
      console.log(`✅ Cleaned post: ${post.title} (Images: ${currentPaths.length} -> ${newPaths.length})`);
    }
  }

  console.log(`\nFinished! Successfully cleaned ${updatedCount} posts.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
