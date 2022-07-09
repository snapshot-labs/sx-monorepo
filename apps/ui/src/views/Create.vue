<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useActions } from '@/composables/useActions';
import { useEditor } from '@/composables/useEditor';

const { proposals } = useEditor();
const route = useRoute();
const router = useRouter();
const { propose } = useActions();
const id = route.params.id;
const key = route.params.key;
const executionHash = '1';
const modalOpen = ref(false);

onMounted(() => {
  if (!key) {
    const str = (Math.random() + 1).toString(36).substring(7);
    router.push({
      name: route.name,
      params: { id, key: str }
    });
  }
});
</script>
<template>
  <div>
    <router-view v-if="key" />
    <div
      class="fixed top-0 border-b w-full px-4 py-3 bg-skin-bg flex h-[79px] z-20"
    >
      <div class="flex-auto space-x-2">
        <router-link :to="{ name: 'overview', params: { id } }" class="mr-2">
          <UiButton class="leading-3 w-[46px] !px-0">
            <IH-arrow-narrow-left class="inline-block" />
          </UiButton>
        </router-link>
        <h4 class="py-2 inline-block">New proposal</h4>
        <div class="h-2 w-[88px] rounded bg-skin-border hidden">
          <div
            class="h-2 rounded bg-gray-600"
            :style="{ width: $route.name === 'editor' ? '33%' : '66%' }"
          />
        </div>
      </div>
      <div class="space-x-2">
        <UiButton
          @click="modalOpen = true"
          class="float-left leading-3 !px-3 rounded-r-none"
        >
          <IH-collection class="inline-block" />
        </UiButton>
        <UiButton
          @click="
            propose(
              id,
              executionHash,
              proposals[`${id}:${key}`].title,
              proposals[`${id}:${key}`].body,
              proposals[`${id}:${key}`].discussion,
              proposals[`${id}:${key}`].execution
            )
          "
          class="rounded-l-none border-l-0 float-left !m-0 !px-3"
        >
          <span v-text="'Publish'" class="hidden mr-2 md:inline-block" />
          <IH-paper-airplane class="inline-block rotate-90" />
        </UiButton>
      </div>
    </div>
    <teleport to="#modal">
      <ModalDrafts :open="modalOpen" :space="id" @close="modalOpen = false" />
    </teleport>
  </div>
</template>
