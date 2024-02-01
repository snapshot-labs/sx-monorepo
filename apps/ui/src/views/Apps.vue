<script setup lang="ts">
const router = useRouter();
const route = useRoute();
const { apps, load, search, categories, loading, loaded } = useApps();

const q: Ref<string> = ref((route.query.q as string) || '');

const results = computed(() => search(q.value));

onMounted(() => load());

watch(
  () => q.value,
  () => router.replace(!q.value ? {} : { query: { q: q.value } })
);
</script>

<template>
  <div>
    <div class="border-b mb-4">
      <Container class="!max-w-screen-lg flex items-center space-x-3">
        <IH-search />
        <input
          v-model="q"
          type="text"
          placeholder="Search for apps"
          class="py-3 bg-transparent flex-auto text-skin-link"
        />
      </Container>
    </div>
    <Container class="!max-w-screen-lg space-y-4">
      <UiLoading v-if="loading && !loaded" class="block" />
      <div v-else-if="q">
        <Link :count="results.length" text="Result(s)" class="inline-block" />
        <div
          v-if="results.length"
          class="flex grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4"
        >
          <App v-for="(app, i) in results" :key="i" :app="app" />
        </div>
        <div v-else class="flex items-center text-skin-link">
          <IH-exclamation-circle class="inline-block mr-2" />
          <span v-text="'There are no apps here.'" />
        </div>
      </div>
      <div v-else>
        <Link text="Featured" class="inline-block" />
        <div class="flex grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <App v-for="(app, i) in apps.filter(({ featured }) => featured)" :key="i" :app="app" />
        </div>
        <div v-for="(category, i) in categories" :key="i">
          <Link
            :count="apps.filter(app => category === app.category).length"
            :text="category"
            class="inline-block"
          />
          <div class="flex grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <App
              v-for="(app, j) in apps.filter(app => category === app.category)"
              :key="j"
              :app="app"
            />
          </div>
        </div>
      </div>
    </Container>
  </div>
</template>
