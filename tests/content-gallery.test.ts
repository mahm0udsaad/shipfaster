import { describe, expect, it } from 'vitest';
import { extractPostCaption } from '../src/lib/content';
import {
  decodeContentImagePaths,
  encodeContentImagePaths,
} from '../src/lib/db/repository';

describe('content gallery path encoding', () => {
  it('keeps legacy single-image rows readable', () => {
    expect(decodeContentImagePaths('account/image.png')).toEqual(['account/image.png']);
    expect(encodeContentImagePaths(['account/image.png'])).toBe('account/image.png');
  });

  it('round-trips an ordered carousel and removes duplicates', () => {
    const encoded = encodeContentImagePaths([
      'account/one.png',
      'account/two.png',
      'account/one.png',
    ]);
    expect(encoded).toBe('["account/one.png","account/two.png"]');
    expect(decodeContentImagePaths(encoded)).toEqual(['account/one.png', 'account/two.png']);
  });

  it('treats malformed historical JSON as a legacy path', () => {
    expect(decodeContentImagePaths('[not-json')).toEqual(['[not-json']);
  });
});

describe('post caption extraction', () => {
  it('copies only the proposed caption from a structured plan', () => {
    const body = [
      'الهدف: اكتشاف',
      'الكابشن المقترح:',
      'ده الكابشن اللي هيتنشر.\nوالسطر التاني منه.',
      'التنفيذ:',
      'Carousel · 4 slides',
      'CTA:',
      'Save',
    ].join('\n\n');
    expect(extractPostCaption(body)).toBe('ده الكابشن اللي هيتنشر.\nوالسطر التاني منه.');
  });

  it('uses the full body for an unstructured post', () => {
    expect(extractPostCaption('Simple caption')).toBe('Simple caption');
  });
});
