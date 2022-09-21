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
    <nav
      class="border-b bg-skin-bg fixed top-0 z-10 right-0 left-0 md:left-[72px]"
    >
      <div class="flex items-center h-[71px] mx-4">
        <div class="flex-auto space-x-2">
          <router-link :to="{ name: 'overview', params: { id } }" class="mr-2">
            <UiButton class="leading-3 w-[46px] !px-0">
              <IH-arrow-narrow-left class="inline-block" />
            </UiButton>
          </router-link>
          <h4 class="py-2 inline-block">New proposal</h4>
        </div>
        <div class="space-x-2">
          <UiButton
            class="float-left leading-3 !px-3 rounded-r-none"
            @click="modalOpen = true"
          >
            <IH-collection class="inline-block" />
          </UiButton>
          <UiButton
            class="rounded-l-none border-l-0 float-left !m-0 !px-3"
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
          >
            <span class="hidden mr-2 md:inline-block" v-text="'Publish'" />
            <IH-paper-airplane class="inline-block rotate-90" />
          </UiButton>
        </div>
      </div>
    </nav>
    <router-view v-if="key" />
    <teleport to="#modal">
      <ModalDrafts :open="modalOpen" :space="id" @close="modalOpen = false" />
    </teleport>
  </div>
</template>
