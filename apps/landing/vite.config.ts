import { readFileSync } from 'node:fs';
import vue from '@vitejs/plugin-vue';
import { Remarkable } from 'remarkable';
import { linkify } from 'remarkable/linkify';
import { defineConfig, Plugin } from 'vite';

// The legal pages' Markdown, each file opening with its "Last updated:"
// line, rendered at build time as the module virtual:legal (see
// src/virtual-legal.d.ts).
const markdown = new Remarkable({ html: false, breaks: true }).use(linkify);

function legalText(): Plugin {
  const id = '\0virtual:legal';
  return {
    name: 'legal-text',
    resolveId: source => (source === 'virtual:legal' ? id : undefined),
    load(source) {
      if (source !== id) return;
      const pages = ['terms', 'privacy'].map(page => {
        const file = new URL(`src/legal/${page}.md`, import.meta.url);
        const [, updated, body] =
          /^Last updated: (.+)\n([\s\S]+)$/.exec(readFileSync(file, 'utf8')) ??
          [];
        if (!updated || !body) throw new Error(`No legal text in ${file}`);
        return [page, { html: markdown.render(body), updated }];
      });
      return `export default ${JSON.stringify(Object.fromEntries(pages))};`;
    }
  };
}

export default defineConfig({ plugins: [vue(), legalText()] });
