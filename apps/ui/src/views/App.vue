<script setup lang="ts">
import { getUrl, simplifyURL } from '@/helpers/utils';

const route = useRoute();
const { load, get, loading, loaded } = useApps();
const { setTitle } = useTitle();

const id = route.params.app as string;
const app = computed(() => get(id));

watchEffect(() => {
  if (!app.value.name) return;

  setTitle(app.value.name);
});

onMounted(() => load());
</script>

<template>
  <div class="pt-12 pb-8">
    <div class="border-t">
      <UiContainer class="!max-w-screen-lg mt-4">
        <UiLoading v-if="loading && !loaded" class="block" />
        <div v-else>
          <div class="flex space-x-1 items-center text-[17px] mb-5">
            <AppLink :to="{ name: 'site-ecosystem' }" class="flex items-center">
              <IH-view-grid class="mr-1" />
              Ecosystem
            </AppLink>
            <IH-chevron-right class="size-[14px]" />
            <div v-text="app.name" />
          </div>
          <div class="md:flex items-center mb-5">
            <div class="flex items-center flex-1 mb-3 md:mb-0">
              <img
                class="size-[80px] rounded-lg mr-3"
                :src="getUrl(app.avatar) || ''"
                :alt="app.name"
              />
              <div class="flex-1 leading-5 mb-1">
                <h1 v-text="app.name" />
                <div v-text="app.category" />
              </div>
            </div>
            <UiButton v-if="app.link" :to="app.link" primary class="w-full">
              Use integration
            </UiButton>
          </div>
          <div class="md:flex md:space-x-4">
            <div class="space-y-5 p-4 flex-grow border rounded-lg h-fit mb-4">
              <div
                v-if="app.images"
                class="flex overflow-y-scroll no-scrollbar space-x-2"
              >
                <img
                  v-for="(image, i) in app.images.split(',')"
                  :key="i"
                  :src="image"
                  :alt="app.name"
                  class="max-w-[96%]"
                />
              </div>
              <div>
                <UiEyebrow class="mb-2">Overview</UiEyebrow>
                <div
                  class="text-md text-skin-link whitespace-pre-line"
                  v-text="app.overview"
                />
              </div>
              <div v-if="app.how">
                <UiEyebrow class="mb-2">How it works</UiEyebrow>
                <div
                  class="text-md text-skin-link whitespace-pre-line"
                  v-text="app.how"
                />
              </div>
              <div v-if="app.start">
                <UiEyebrow class="mb-2">Get started</UiEyebrow>
                <div
                  class="text-md text-skin-link whitespace-pre-line"
                  v-text="app.start"
                />
              </div>
              <div v-if="app.form">
                <AppLink :to="app.form" class="text-skin-text">
                  <IH-pencil class="inline-block mr-1" /> Edit this page
                </AppLink>
              </div>
            </div>
            <div
              class="border rounded-lg md:w-[300px] shrink-0 h-fit p-4 space-y-3 mb-4"
            >
              <div>
                <UiEyebrow>Built by</UiEyebrow>
                {{ app.author }}
              </div>
              <div v-if="app.website">
                <UiEyebrow>Website</UiEyebrow>
                <AppLink :to="app.website">
                  {{ simplifyURL(app.website) }}
                </AppLink>
              </div>
              <div v-if="app.x">
                <UiEyebrow>X (Twitter)</UiEyebrow>
                <AppLink :to="`https://x.com/${app.x}`">
                  {{ app.x }}
                </AppLink>
              </div>
              <div v-if="app.github">
                <UiEyebrow>Source code</UiEyebrow>
                <AppLink :to="app.github">
                  {{ simplifyURL(app.github) }}
                </AppLink>
              </div>
            </div>
          </div>
        </div>
      </UiContainer>
    </div>
  </div>
</template>
