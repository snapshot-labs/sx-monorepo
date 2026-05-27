<script setup lang="ts">
import { type DocNavItem, getPageTitle, getAllPageSlugs } from '@/helpers/docs';

const props = defineProps<{ navigation: DocNavItem[]; currentSlug: string }>();
const expanded = ref<Record<string, boolean>>({});

function isGroup(
  item: DocNavItem
): item is { group: string; pages: DocNavItem[] } {
  return typeof item !== 'string';
}

function isExpanded(key: string, item: { pages: DocNavItem[] }) {
  return (
    expanded.value[key] ??
    getAllPageSlugs(item.pages).includes(props.currentSlug)
  );
}

function toggle(key: string, item: { pages: DocNavItem[] }) {
  expanded.value[key] = !isExpanded(key, item);
}

function toRoute(slug: string) {
  return slug === 'index'
    ? { name: 'docs' }
    : { name: 'docs', params: { path: slug.split('/') } };
}
</script>

<template>
  <nav class="space-y-5">
    <div v-for="(item, i) in navigation" :key="i">
      <template v-if="isGroup(item)">
        <div
          class="text-xs uppercase tracking-widest text-skin-heading font-semibold mb-2 opacity-40 px-4"
        >
          {{ item.group }}
        </div>
        <template v-for="(page, j) in item.pages" :key="j">
          <router-link
            v-if="!isGroup(page)"
            :to="toRoute(page)"
            class="block py-1 px-4 text-[17px]"
            :class="
              currentSlug === page
                ? 'text-skin-link'
                : 'text-skin-text hover:text-skin-link'
            "
          >
            {{ getPageTitle(page) }}
          </router-link>
          <div v-else>
            <button
              type="button"
              class="w-full flex items-center justify-between py-1 px-4 text-[17px] text-skin-text hover:text-skin-link cursor-pointer"
              @click="toggle(`${i}-${j}`, page)"
            >
              <span>{{ page.group }}</span>
              <IH-chevron-right
                class="w-[14px] h-[14px] opacity-50"
                :class="{
                  'rotate-90': isExpanded(`${i}-${j}`, page)
                }"
              />
            </button>
            <template v-if="isExpanded(`${i}-${j}`, page)">
              <router-link
                v-for="(sub, k) in page.pages.filter(
                  (s): s is string => !isGroup(s)
                )"
                :key="k"
                :to="toRoute(sub)"
                class="block py-1 px-4 pl-6 text-[17px]"
                :class="
                  currentSlug === sub
                    ? 'text-skin-link'
                    : 'text-skin-text hover:text-skin-link'
                "
              >
                {{ getPageTitle(sub) }}
              </router-link>
            </template>
          </div>
        </template>
      </template>
    </div>
  </nav>
</template>
