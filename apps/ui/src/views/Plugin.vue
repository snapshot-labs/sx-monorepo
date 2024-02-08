<script setup lang="ts">
import { simplifyURL } from '@/helpers/utils';

const route = useRoute();
const { load, get, loading, loaded } = usePlugins();

const id = route.params.id as string;
const plugin = computed(() => get(id));

onMounted(() => load());
</script>

<template>
  <div class="pt-4">
    <UiContainer class="!max-w-screen-lg">
      <UiLoading v-if="loading && !loaded" class="block" />
      <div v-else>
        <div class="flex space-x-1 items-center text-sm mb-4">
          <router-link :to="{ name: 'plugins' }" class="flex items-center">
            <IH-view-grid class="mr-1" />
            Apps
          </router-link>
          <IH-chevron-right class="w-[14px] h-[14px]" />
          <div v-text="plugin.name" />
        </div>
        <div class="md:flex items-center mb-5">
          <div class="flex items-center flex-1 mb-3 md:mb-0">
            <img class="w-[80px] h-[80px] rounded-lg mr-3" :src="plugin.avatar" />
            <div class="flex-1 leading-5 mb-1">
              <h1 v-text="plugin.name" />
              <div v-text="plugin.category" />
            </div>
          </div>
          <a v-if="plugin.link" :href="plugin.link" target="_blank">
            <UiButton class="primary w-full">Use integration</UiButton>
          </a>
        </div>
        <div class="md:flex md:space-x-4">
          <div class="space-y-5 p-4 border rounded-lg h-fit mb-4">
            <div>
              <div class="eyebrow mb-2">Overview</div>
              <div class="text-md text-skin-link" v-text="plugin.overview" />
            </div>
            <div v-if="plugin.how">
              <div class="eyebrow mb-2">How it works</div>
              <div class="text-md text-skin-link" v-text="plugin.how" />
            </div>
            <div v-if="plugin.start">
              <div class="eyebrow mb-2">Get started</div>
              <div class="text-md text-skin-link" v-text="plugin.start" />
            </div>
          </div>
          <div class="border rounded-lg md:w-[300px] shrink-0 h-fit p-4 space-y-3 mb-4">
            <div>
              <h4 class="eyebrow" v-text="'Built by'" />
              {{ plugin.author }}
            </div>
            <div v-if="plugin.website">
              <h4 class="eyebrow" v-text="'Website'" />
              <a :href="plugin.website" target="_blank">
                {{ simplifyURL(plugin.website) }}
                <IH-arrow-sm-right class="inline-block -rotate-45" />
              </a>
            </div>
            <div v-if="plugin.x">
              <h4 class="eyebrow" v-text="'X (Twitter)'" />
              <a :href="`https://twitter.com/${plugin.x}`" target="_blank">
                {{ plugin.x }}
                <IH-arrow-sm-right class="inline-block -rotate-45" />
              </a>
            </div>
            <div v-if="plugin.github">
              <h4 class="eyebrow" v-text="'Source code'" />
              <a :href="plugin.github" target="_blank">
                {{ simplifyURL(plugin.github) }}
                <IH-arrow-sm-right class="inline-block -rotate-45" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </UiContainer>
  </div>
</template>
