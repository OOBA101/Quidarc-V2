export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  url: string;
}

export interface DAppItem {
  id: string;
  name: string;
  category: string;
  summary: string;
  url: string;
}

// Real, verified sources — checked directly against arc.io / arclenz.xyz / testnet.arcscan.app
// while building this feature. If any of these links go stale, verify against arc.io/ecosystem
// before replacing them; do not guess at a new project's URL.
const FALLBACK_NEWS: NewsItem[] = [
  {
    id: 'arc-blog',
    title: 'Latest from the Arc blog',
    summary: 'Official announcements and updates from the Arc team.',
    url: 'https://www.arc.io/blog',
  },
  {
    id: 'arc-pressroom',
    title: 'Arc pressroom',
    summary: 'Formal press announcements from Circle / Arc.',
    url: 'https://www.arc.io/pressroom',
  },
];

export const CONFIRMED_DAPPS: DAppItem[] = [
  {
    id: 'arc-ecosystem',
    name: 'Arc Ecosystem Directory',
    category: 'Directory',
    summary: "Circle's own official, curated list of projects building on Arc — the most authoritative single source for what's actually live.",
    url: 'https://www.arc.io/ecosystem',
  },
  {
    id: 'arclens',
    name: 'ArcLens',
    category: 'Directory',
    summary: 'Independent Arc ecosystem tracker with deployer-verified TVL, volume, and revenue per protocol. Use this to check whether a specific project is genuinely live before relying on it.',
    url: 'https://arclenz.xyz',
  },
  {
    id: 'arc-explorer',
    name: 'Arc Testnet Explorer',
    category: 'Explorer',
    summary: 'Official Arc Testnet block explorer — verify any transaction or address directly.',
    url: 'https://testnet.arcscan.app',
  },
  {
    id: 'lend-borrow',
    name: 'Lending & Borrowing',
    category: 'Lend / Borrow',
    summary: 'Circle has named Aave, Maple, and Morpho as Arc testnet ecosystem partners for lending. Confirm current live status on the Ecosystem Directory or ArcLens before directing a user to a specific one.',
    url: 'https://www.arc.io/ecosystem',
  },
  {
    id: 'yield',
    name: 'Yield',
    category: 'Yield',
    summary: 'Circle has named Centrifuge, Superform, and Securitize as Arc testnet ecosystem partners for yield. Confirm current live status before directing a user to a specific one.',
    url: 'https://www.arc.io/ecosystem',
  },
];

/**
 * Extracts blog post links from raw Arc blog HTML. Deliberately generic — matches any
 * <a href="...blog/...">text</a> pair rather than depending on specific class names or
 * markup structure, since that structure was not something we could verify live against
 * (arc.io isn't reachable from this build/test environment). This means it degrades
 * gracefully rather than breaking outright if Arc's page layout changes, but it has not
 * been confirmed to produce good results against the real live page — verify once
 * deployed somewhere with real network access, and lean on the fallback list above if it
 * doesn't extract anything useful.
 */
export function parseArcBlogPosts(html: string, limit = 5): NewsItem[] {
  const results: NewsItem[] = [];
  const seen = new Set<string>();
  const linkPattern = /<a\s+[^>]*href="([^"]*\/blog\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = linkPattern.exec(html)) !== null && results.length < limit) {
    const href = match[1];
    const rawText = match[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

    if (!rawText || rawText.length < 4) continue;
    if (href.endsWith('/blog') || href.endsWith('/blog/')) continue; // skip "back to blog" links
    if (seen.has(href)) continue;
    seen.add(href);

    const url = href.startsWith('http') ? href : `https://www.arc.io${href.startsWith('/') ? '' : '/'}${href}`;
    results.push({
      id: `arc-news-${results.length + 1}`,
      title: rawText,
      summary: 'From the official Arc blog.',
      url,
    });
  }

  return results;
}

export class ContentService {
  async listNews(): Promise<{ items: NewsItem[] }> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const response = await fetch('https://www.arc.io/blog', { signal: controller.signal });
      clearTimeout(timeout);

      if (!response.ok) {
        return { items: FALLBACK_NEWS };
      }

      const html = await response.text();
      const parsed = parseArcBlogPosts(html);
      return { items: parsed.length > 0 ? parsed : FALLBACK_NEWS };
    } catch {
      // Network unavailable, timeout, or parsing failure — never break the feature,
      // fall back to real (if less fresh) links instead.
      return { items: FALLBACK_NEWS };
    }
  }

  listDApps(): { items: DAppItem[] } {
    return { items: CONFIRMED_DAPPS };
  }
}