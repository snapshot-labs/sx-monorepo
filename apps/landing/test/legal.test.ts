import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'bun:test';

// Words that keep their capital inside a heading.
const NAMES = ['Snapshot', 'IPFS', 'AI', 'MCP'];

for (const page of ['terms', 'privacy']) {
  describe(page, () => {
    const text = readFileSync(
      new URL(`../src/legal/${page}.md`, import.meta.url),
      'utf8'
    );

    test('opens with its last update, as the build reads it', () => {
      expect(text).toMatch(/^Last updated: \d{1,2} [A-Z][a-z]+ \d{4}\n/);
    });

    test('has no en or em dash', () => {
      expect(text).not.toMatch(/[–—]/);
    });

    test('has its headings in sentence case', () => {
      const headings = text.match(/^#+ .+$/gm) ?? [];
      expect(headings.length).toBeGreaterThan(0);
      for (const heading of headings) {
        const capitals = heading
          .replace(/^#+ [\d.]*\s*/, '')
          .split(' ')
          .slice(1)
          .map(word => word.replace(/\W/g, ''))
          .filter(word => /^[A-Z]/.test(word) && !NAMES.includes(word));
        expect({ heading, capitals }).toEqual({ heading, capitals: [] });
      }
    });
  });
}
