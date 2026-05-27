import docsConfig from '../../../../docs/docs.json';

export type DocNavItem = string | { group: string; pages: DocNavItem[] };

export interface DocPage {
  title: string;
  description: string;
  body: string;
  videos: { src: string; placeholder: string }[];
}

const modules = import.meta.glob('../../../../docs/**/*.mdx', { query: '?raw', import: 'default' });

export interface DocSearchEntry {
  slug: string;
  title: string;
  snippet: string;
}

const titleMap: Record<string, string> = {};
const searchIndex: DocSearchEntry[] = [];

for (const [path, raw] of Object.entries(
  import.meta.glob('../../../../docs/**/*.mdx', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
)) {
  const slug = path.replace('../../../../docs/', '').replace('.mdx', '');
  const title = raw.match(/title:\s*"(.+?)"/)?.[1] || '';
  titleMap[slug] = raw.match(/sidebarTitle:\s*"(.+?)"/)?.[1] || title;
  const text = raw.replace(/^---[\s\S]*?---\n/, '').replace(/<[^>]+>/g, '').replace(/[#*`\[\]()]/g, '').trim();
  searchIndex.push({ slug, title, snippet: text.slice(0, 200) });
}

export function searchDocs(query: string): DocSearchEntry[] {
  if (!query) return [];
  const q = query.toLowerCase();
  return searchIndex
    .filter(e => e.title.toLowerCase().includes(q) || e.snippet.toLowerCase().includes(q))
    .slice(0, 8);
}

export async function loadDoc(slug: string): Promise<DocPage | null> {
  const key = [`../../../../docs/${slug}.mdx`, `../../../../docs/${slug}/index.mdx`].find(c => c in modules);
  if (!key) return null;
  const raw = (await modules[key]()) as string;

  const fm = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  const frontmatter = fm?.[1] || '';
  let body = fm?.[2] || raw;

  const videos: DocPage['videos'] = [];
  body = body.replace(/<video[\s\S]*?src="([^"]+)"[\s\S]*?(?:\/>|<\/video>)\n?/g, (_, src) => {
    const id = `__video_${videos.length}__`;
    videos.push({ src, placeholder: id });
    return `\n${id}\n\n`;
  });

  body = body
    .replace(/<(Info|Warning|Tip|Note)>\n?([\s\S]*?)\n?<\/\1>/g, (_, _t, c) => c.trim().split('\n').map((l: string) => `> ${l}`).join('\n') + '\n')
    .replace(/<\/?Tabs>\n?/g, '')
    .replace(/<Tab title="(.+?)">\n?([\s\S]*?)\n?<\/Tab>/g, (_, t, c) => `### ${t}\n\n${c.trim()}\n\n`)
    .replace(/<\/?AccordionGroup>\n?/g, '')
    .replace(/<Accordion title="(.+?)">\n?([\s\S]*?)\n?<\/Accordion>/g, (_, t, c) => `**${t}**\n\n${c.trim()}\n\n`)
    .replace(/<CardGroup[^>]*>\n?/g, '').replace(/<\/CardGroup>\n?/g, '')
    .replace(/<Card title="(.+?)" href="(.+?)">\n?([\s\S]*?)\n?<\/Card>/g, (_, t, h, d) => `**[${t}](${h})**\n${d.trim()}\n\n`)
    .replace(/\/images\//g, '/docs-images/')
    .replace(/\/videos\//g, '/docs-videos/')
    .replace(/<[A-Z]\w+\s[^>]*\/>\n?/g, '')
    .replace(/<[A-Z]\w+[^>]*>[\s\S]*?<\/[A-Z]\w+>\n?/g, '')
    .trim();

  return {
    title: frontmatter.match(/title:\s*"(.+?)"/)?.[1] || '',
    description: frontmatter.match(/description:\s*"(.+?)"/)?.[1] || '',
    body,
    videos
  };
}

export const getNavigation = (): DocNavItem[] => docsConfig.navigation.groups;

export function getAllPageSlugs(items?: DocNavItem[]): string[] {
  return (items || getNavigation()).flatMap(item =>
    typeof item === 'string' ? [item] : getAllPageSlugs(item.pages)
  );
}

export function getPageTitle(slug: string): string {
  return titleMap[slug] || slug.split('/').pop()!.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
