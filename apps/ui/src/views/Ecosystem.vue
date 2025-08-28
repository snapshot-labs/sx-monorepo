<script setup lang="ts">
const router = useRouter();
const route = useRoute();
const { apps, load, search, categories, loading, loaded } = useApps();

useTitle('Ecosystem');

const q: Ref<string> = ref((route.query.q as string) || '');

const results = computed(() => search(q.value));

onMounted(() => load());

watch(
  () => q.value,
  () => router.replace(!q.value ? {} : { query: { q: q.value } })
);
</script>

<template>
  <div class="py-12">
    <div class="border-y mb-4">
      <UiContainer class="!max-w-screen-lg flex items-center space-x-3">
        <IH-search />
        <input
          v-model="q"
          type="text"
          placeholder="Search for integrations"
          class="py-3 bg-transparent flex-auto text-skin-link text-md"
        />
      </UiContainer>
    </div>
    <UiContainer class="!max-w-screen-lg space-y-4">
      <UiLoading v-if="loading && !loaded" class="block" />
      <div v-else-if="q">
        <UiLabel
          :count="results.length"
          text="Result(s)"
          class="inline-block"
        />
        <div
          v-if="results.length"
          class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4"
        >
          <AppsListItem v-for="(app, i) in results" :key="i" :app="app" />
        </div>
        <div v-else class="flex items-center text-skin-link gap-2">
          <IH-exclamation-circle />
          <span v-text="'There are no integrations here.'" />
        </div>
      </div>
      <div v-else>
        <UiLabel text="Featured" class="inline-block" />
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <AppsListItem
            v-for="(app, i) in apps.filter(({ featured }) => featured)"
            :key="i"
            :app="app"
          />
        </div>
        <div v-for="(category, i) in categories" :key="i">
          <UiLabel
            :count="apps.filter(app => category === app.category).length"
            :text="category"
            class="inline-block"
          />
          <div
            class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4"
          >
            <AppsListItem
              v-for="(app, j) in apps.filter(app => category === app.category)"
              :key="j"
              :app="app"
            />
          </div>
        </div>
      </div>
    </UiContainer>
  </div>
</template>
