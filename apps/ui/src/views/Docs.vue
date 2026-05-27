<script setup lang="ts">
import { loadDoc, getNavigation, searchDocs, type DocPage } from '@/helpers/docs';
import DocsSidebar from '@/components/Docs/Sidebar.vue';

const CHATGPT_BASE = 'https://chatgpt.com/?hints=search&q=';
const CLAUDE_BASE = 'https://claude.ai/new?q=';

const route = useRoute();
const router = useRouter();
const uiStore = useUiStore();
const { copy } = useClipboard();

const navigation = getNavigation();
const searchQuery = ref('');
const searchResults = computed(() => searchDocs(searchQuery.value));

function goToResult(slug: string) {
  searchQuery.value = '';
  router.push(
    slug === 'index'
      ? { name: 'docs' }
      : { name: 'docs', params: { path: slug.split('/') } }
  );
}
const doc = ref<DocPage | null>(null);
const loading = ref(true);
const toc = ref<{ id: string; text: string; level: number }[]>([]);
const activeHeading = ref('');
const contentRef = ref<HTMLDivElement>();
let observer: IntersectionObserver | null = null;

const currentSlug = computed(() => {
  const p = route.params.path;
  if (!p || (Array.isArray(p) && !p.length)) return 'index';
  return Array.isArray(p) ? p.join('/') : p;
});

const contentSegments = computed(() => {
  if (!doc.value) return [];
  const { body, videos } = doc.value;
  if (!videos.length) return [{ type: 'md' as const, body }];

  const segments: ({ type: 'md'; body: string } | { type: 'video'; src: string })[] = [];
  let remaining = body;
  for (const video of videos) {
    const idx = remaining.indexOf(video.placeholder);
    if (idx === -1) continue;
    const before = remaining.slice(0, idx).trim();
    if (before) segments.push({ type: 'md', body: before });
    segments.push({ type: 'video', src: video.src });
    remaining = remaining.slice(idx + video.placeholder.length).trim();
  }
  if (remaining) segments.push({ type: 'md', body: remaining });
  return segments;
});

const openInChatGPTUrl = computed(
  () =>
    doc.value &&
    `${CHATGPT_BASE}${encodeURIComponent(`Help me understand this: ${doc.value.title}`)}`
);
const openInClaudeUrl = computed(
  () =>
    doc.value &&
    `${CLAUDE_BASE}${encodeURIComponent(`Help me understand this: ${doc.value.title}`)}`
);

watch(
  currentSlug,
  async slug => {
    loading.value = true;
    doc.value = await loadDoc(slug);
    loading.value = false;
    if (doc.value) {
      useTitle(doc.value.title || 'Docs');
      nextTick(() => {
        buildToc();
        const heading = route.query.heading as string;
        if (heading) {
          setTimeout(() => {
            const el = document.getElementById(heading);
            if (el) el.scrollIntoView({ block: 'start' });
          }, 200);
        }
      });
    }
  },
  { immediate: true }
);

function buildToc() {
  if (!contentRef.value) return;
  observer?.disconnect();

  const entries: typeof toc.value = [];
  contentRef.value.querySelectorAll('h2, h3').forEach(el => {
    const text = el.textContent?.trim() || '';
    const id = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-');
    el.setAttribute('id', id);


    entries.push({ id, text, level: el.tagName === 'H3' ? 3 : 2 });
  });
  toc.value = entries;
  if (entries.length) activeHeading.value = entries[0].id;

  observer = new IntersectionObserver(
    items => {
      for (const item of items)
        if (item.isIntersecting) {
          activeHeading.value = item.target.id;
          break;
        }
    },
    { rootMargin: '0px 0px -80% 0px' }
  );
  contentRef.value.querySelectorAll('h2[id], h3[id]').forEach(el => {
    observer!.observe(el);
  });
}

onUnmounted(() => observer?.disconnect());

function copyPage() {
  if (!doc.value) return;
  copy(`# ${doc.value.title}\n\n${doc.value.body}`);
  uiStore.addNotification('success', 'Page copied as Markdown.');
}

function handleClick(e: MouseEvent) {
  const target = (e.target as HTMLElement).closest('a');
  if (!target) return;
  const href = target.getAttribute('href');
  if (!href || href.startsWith('http') || href.startsWith('#')) return;
  e.preventDefault();
  router.push({
    name: 'docs',
    params: { path: href.replace(/^\//, '').replace(/\/$/, '').split('/') }
  });
}
</script>

<template>
  <div class="flex" style="min-height: calc(100vh - 72px)">
    <div class="hidden lg:block w-[280px] shrink-0">
      <div class="fixed top-0 w-[280px] h-[72px] border-r border-b border-skin-border flex items-center px-4 z-50 bg-skin-bg">
        <h4 class="truncate">Documentation</h4>
      </div>
      <aside
        class="fixed top-[72px] w-[280px] border-r border-skin-border py-4 overflow-y-auto no-scrollbar"
        style="height: calc(100vh - 72px)"
      >
        <DocsSidebar
          :navigation="navigation"
          :current-slug="currentSlug"
        />
      </aside>
    </div>

    <main
      class="flex-1 min-w-0 px-4 py-5 lg:px-8 lg:py-6"
      @click="handleClick"
    >
      <div v-if="loading" class="text-skin-text opacity-50">Loading...</div>
      <div v-else-if="doc" ref="contentRef" class="max-w-3xl">
        <div class="flex items-start justify-between gap-4 mb-2">
          <h1 class="text-3xl font-bold text-skin-heading">
            {{ doc.title }}
          </h1>
          <UiDropdown>
            <template #button>
              <UiButton uniform>
                <IH-share />
              </UiButton>
            </template>
            <template #items>
              <UiDropdownItem @click="copyPage">
                <IH-duplicate />
                Copy page
              </UiDropdownItem>
              <UiDropdownItem :to="openInChatGPTUrl">
                <IH-external-link />
                Open in ChatGPT
              </UiDropdownItem>
              <UiDropdownItem :to="openInClaudeUrl">
                <IH-external-link />
                Open in Claude
              </UiDropdownItem>
            </template>
          </UiDropdown>
        </div>
        <p
          v-if="doc.description"
          class="text-lg text-skin-text opacity-60 mb-4"
        >
          {{ doc.description }}
        </p>
        <template v-for="(seg, i) in contentSegments" :key="i">
          <UiMarkdown v-if="seg.type === 'md'" :body="seg.body" />
          <video
            v-else
            autoplay
            muted
            controls
            playsinline
            class="w-full rounded-xl my-4"
            :src="seg.src"
          />
        </template>
      </div>
      <div v-else class="text-skin-text">Page not found.</div>
    </main>
  </div>

  <Teleport to="#topnav-search-slot" defer>
    <label class="flex items-center w-full space-x-2.5 relative">
      <IH-search class="shrink-0" />
      <input
        v-model.trim="searchQuery"
        type="text"
        placeholder="Search docs..."
        class="bg-transparent text-skin-link text-[19px] w-full"
      />
      <div
        v-if="searchQuery"
        class="absolute top-10 -left-8 w-[400px] bg-skin-bg border border-skin-border rounded-lg shadow-lg overflow-hidden z-50"
      >
        <button
          v-for="result in searchResults"
          :key="result.slug"
          type="button"
          class="w-full text-left px-4 py-2.5 hover:bg-skin-border cursor-pointer"
          @click="goToResult(result.slug)"
        >
          <div class="text-skin-link text-[17px]">{{ result.title }}</div>
          <div class="text-skin-text text-sm opacity-60 truncate">
            {{ result.snippet }}
          </div>
        </button>
        <div
          v-if="!searchResults.length"
          class="px-4 py-2.5 text-skin-text opacity-60"
        >
          No results
        </div>
      </div>
    </label>
  </Teleport>

  <Teleport to=".app-placeholder-sidebar">
    <div
      v-if="toc.length"
      class="fixed top-[72px] p-5 overflow-y-auto no-scrollbar"
      style="max-height: calc(100vh - 72px); width: 240px"
    >
      <div
        class="text-xs uppercase tracking-widest text-skin-heading font-semibold mb-3 opacity-40"
      >
        On this page
      </div>
      <nav class="space-y-1">
        <button
          v-for="entry in toc"
          :key="entry.id"
          type="button"
          class="block w-full text-left text-[15px] py-1 cursor-pointer"
          :class="[
            entry.level === 3 ? 'pl-3' : '',
            activeHeading === entry.id
              ? 'text-skin-link'
              : 'text-skin-text opacity-60 hover:opacity-100'
          ]"
          @click="document.getElementById(entry.id)?.scrollIntoView()"
        >
          {{ entry.text }}
        </button>
      </nav>
    </div>
  </Teleport>
</template>

<style scoped>
:deep(h2[id]),
:deep(h3[id]) {
  scroll-margin-top: 90px;
}
</style>
