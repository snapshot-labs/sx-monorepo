import { readFileSync } from 'node:fs';
import vue from '@vitejs/plugin-vue';
import { Remarkable } from 'remarkable';
import { linkify } from 'remarkable/linkify';
import { defineConfig, Plugin } from 'vite';

// The legal pages render the app's own text, with the app's Markdown options,
// as the module virtual:legal (see src/virtual-legal.d.ts).
const LEGAL = {
  terms: '../ui/src/views/Terms.vue',
  privacy: '../ui/src/views/Policy.vue'
};
const markdown = new Remarkable({ html: false, breaks: true }).use(linkify);

function legalText(): Plugin {
  const id = '\0virtual:legal';
  return {
    name: 'legal-text',
    resolveId: source => (source === 'virtual:legal' ? id : undefined),
    load(source) {
      if (source !== id) return;
      const pages = Object.entries(LEGAL).map(([page, file]) => {
        const text = readFileSync(new URL(file, import.meta.url), 'utf8');
        const body = /const terms = `([\s\S]*?)`;/.exec(text)?.[1];
        const updated = /Last updated: ([^<]+)</.exec(text)?.[1];
        if (!body || !updated) throw new Error(`No legal text in ${file}`);
        return [page, { html: markdown.render(body), updated: updated.trim() }];
      });
      return `export default ${JSON.stringify(Object.fromEntries(pages))};`;
    }
  };
}

export default defineConfig({ plugins: [vue(), legalText()] });
