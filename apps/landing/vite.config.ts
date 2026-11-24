import { readFileSync } from 'node:fs';
import { Remarkable } from 'remarkable';
import { linkify } from 'remarkable/linkify';
import { defineConfig, Plugin } from 'vite';

// The legal pages render the app's own text, with the app's Markdown options.
const LEGAL: Record<string, string> = {
  'terms/index.html': '../ui/src/views/Terms.vue',
  'privacy/index.html': '../ui/src/views/Policy.vue'
};
const markdown = new Remarkable({ html: false, breaks: true }).use(linkify);

function legalPages(): Plugin {
  return {
    name: 'legal-pages',
    transformIndexHtml(html, { filename }) {
      const page = Object.keys(LEGAL).find(file => filename.endsWith(file));
      if (!page) return html;
      const source = readFileSync(
        new URL(LEGAL[page]!, import.meta.url),
        'utf8'
      );
      const body = /const terms = `([\s\S]*?)`;/.exec(source)?.[1];
      const updated = /Last updated: ([^<]+)</.exec(source)?.[1];
      if (!body || !updated) throw new Error(`No legal text in ${LEGAL[page]}`);
      return html
        .replace('<!--updated-->', updated.trim())
        .replace('<!--legal-->', markdown.render(body));
    }
  };
}

export default defineConfig({
  plugins: [legalPages()],
  build: {
    rollupOptions: {
      input: ['index.html', ...Object.keys(LEGAL)]
    }
  }
});
