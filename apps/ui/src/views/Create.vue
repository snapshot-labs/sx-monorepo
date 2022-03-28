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
  <router-view v-if="key" class="mb-8 pb-4" />
  <div class="fixed bottom-0 w-full border-t px-4 py-3 bg-skin-block-bg flex">
    <div class="flex-auto space-x-2">
      <h5 class="flex-auto mt-2 hidden sm:inline-block">Step 1 on 3</h5>
      <div class="h-2 w-[128px] rounded bg-skin-border hidden sm:inline-block">
        <div
          class="h-2 rounded bg-gray-600"
          :style="{ width: $route.name === 'editor' ? '33%' : '66%' }"
        />
      </div>
    </div>
    <div class="space-x-2">
      <router-link :to="{ name: 'editor', params: { id, key } }">
        <UiButton v-if="$route.name !== 'editor'" class="leading-3 !px-0 w-7">
          <Icon name="back" class="align-middle" />
        </UiButton>
      </router-link>
      <span v-if="$route.name !== 'editor'">
        <UiButton
          @click="
            propose(
              id,
              executionHash,
              proposals[`${id}:${key}`].title,
              proposals[`${id}:${key}`].body,
              proposals[`${id}:${key}`].discussion
            )
          "
          class="leading-3"
        >
          Publish
        </UiButton>
      </span>
      <span class="space-x-2" v-else>
        <UiButton @click="modalOpen = true" class="leading-3 !px-0 w-7">
          <Icon name="receipt-outlined" class="align-middle px-1" />
        </UiButton>
        <router-link :to="{ name: 'execution', params: { id, key } }">
          <UiButton class="leading-3">
            Next
            <Icon name="go" class="align-middle" />
          </UiButton>
        </router-link>
      </span>
    </div>
    <teleport to="#modal">
      <ModalDrafts :open="modalOpen" :space="id" @close="modalOpen = false" />
    </teleport>
  </div>
</template>
