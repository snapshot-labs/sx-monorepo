<script setup lang="ts">
const router = useRouter();
const route = useRoute();
const { plugins, load, search, categories, loading, loaded } = usePlugins();

const q: Ref<string> = ref((route.query.q as string) || '');

const filteredPlugins = computed(() => search(q.value));

onMounted(() => load());

watch(
  () => q.value,
  () => router.replace(!q.value ? {} : { query: { q: q.value } })
);
</script>

<template>
  <div>
    <div class="border-b mb-4">
      <UiContainer class="!max-w-screen-lg flex items-center space-x-3">
        <IH-search />
        <input
          v-model="q"
          type="text"
          placeholder="Search for apps"
          class="py-3 bg-transparent flex-auto text-skin-link"
        />
      </UiContainer>
    </div>
    <UiContainer class="!max-w-screen-lg space-y-4">
      <UiLoading v-if="loading && !loaded" class="block" />
      <div v-else-if="q">
        <UiLink :count="filteredPlugins.length" text="Result(s)" class="inline-block" />
        <div
          v-if="filteredPlugins.length"
          class="flex grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4"
        >
          <PluginsListItem v-for="(plugin, i) in filteredPlugins" :key="i" :plugin="plugin" />
        </div>
        <div v-else class="flex items-center text-skin-link">
          <IH-exclamation-circle class="inline-block mr-2" />
          <span v-text="'There are no apps here.'" />
        </div>
      </div>
      <div v-else>
        <UiLink text="Featured" class="inline-block" />
        <div class="flex grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <PluginsListItem
            v-for="(plugin, i) in plugins.filter(({ featured }) => featured)"
            :key="i"
            :plugin="plugin"
          />
        </div>
        <div v-for="(category, i) in categories" :key="i">
          <UiLink
            :count="plugins.filter(plugin => category === plugin.category).length"
            :text="category"
            class="inline-block"
          />
          <div class="flex grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <PluginsListItem
              v-for="(plugin, j) in plugins.filter(plugin => category === plugin.category)"
              :key="j"
              :plugin="plugin"
            />
          </div>
        </div>
      </div>
    </UiContainer>
  </div>
</template>
