import { describe, expect, it } from 'vitest';
import { parseArcBlogPosts } from './contentService.js';

describe('parseArcBlogPosts', () => {
  it('extracts title and url from simple blog links', () => {
    const html = `
      <a href="/blog/arc-house-launch">Introducing Arc House</a>
      <a href="/blog/mainnet-validators">Meet the Founding Validators</a>
    `;
    const result = parseArcBlogPosts(html);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      title: 'Introducing Arc House',
      url: 'https://www.arc.io/blog/arc-house-launch',
    });
    expect(result[1]).toMatchObject({
      title: 'Meet the Founding Validators',
      url: 'https://www.arc.io/blog/mainnet-validators',
    });
  });

  it('strips nested tags from the link text', () => {
    const html = `<a href="/blog/some-post"><span class="title">Some <b>Post</b></span></a>`;
    const result = parseArcBlogPosts(html);
    expect(result[0].title).toBe('Some Post');
  });

  it('skips the "back to blog" self-link', () => {
    const html = `
      <a href="/blog">Back to blog</a>
      <a href="/blog/">All posts</a>
      <a href="/blog/real-post">A Real Post</a>
    `;
    const result = parseArcBlogPosts(html);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('A Real Post');
  });

  it('deduplicates repeated links to the same post', () => {
    const html = `
      <a href="/blog/dup-post">Duplicate Post</a>
      <a href="/blog/dup-post">Duplicate Post (read more)</a>
    `;
    const result = parseArcBlogPosts(html);
    expect(result).toHaveLength(1);
  });

  it('passes through already-absolute URLs unchanged', () => {
    const html = `<a href="https://www.arc.io/blog/absolute-post">Absolute Post</a>`;
    const result = parseArcBlogPosts(html);
    expect(result[0].url).toBe('https://www.arc.io/blog/absolute-post');
  });

  it('respects the limit parameter', () => {
    const html = Array.from({ length: 10 }, (_, i) => `<a href="/blog/post-${i}">Post ${i}</a>`).join('\n');
    const result = parseArcBlogPosts(html, 3);
    expect(result).toHaveLength(3);
  });

  it('returns an empty array for HTML with no blog links, without throwing', () => {
    const html = `<div>No links here</div><a href="/pricing">Pricing</a>`;
    expect(() => parseArcBlogPosts(html)).not.toThrow();
    expect(parseArcBlogPosts(html)).toHaveLength(0);
  });

  it('ignores links with very short or empty text', () => {
    const html = `<a href="/blog/icon-only"></a><a href="/blog/real">A Real Title</a>`;
    const result = parseArcBlogPosts(html);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('A Real Title');
  });
});