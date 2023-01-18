<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSpacesStore } from '@/stores/spaces';
import { useActions } from '@/composables/useActions';
import { useEditor } from '@/composables/useEditor';
import { useModal } from '@/composables/useModal';

const { proposals } = useEditor();
const { modalOpen: globalModalOpen } = useModal();
const route = useRoute();
const router = useRouter();
const { propose } = useActions();
const spacesStore = useSpacesStore();
const id = route.params.id as string;
const key = route.params.key;
const modalOpen = ref(false);
const sending = ref(false);

onMounted(() => {
  spacesStore.fetchSpace(id);

  if (!key && route.name) {
    globalModalOpen.value = false;

    const str = (Math.random() + 1).toString(36).substring(7);
    router.replace({
      name: route.name,
      params: { id, key: str }
    });
  }
});

const space = computed(() => spacesStore.spacesMap.get(id));

async function handleProposeClick() {
  if (!space.value) return;

  sending.value = true;

  try {
    await propose(
      space.value,
      proposals[`${id}:${key}`].title,
      proposals[`${id}:${key}`].body,
      proposals[`${id}:${key}`].discussion,
      proposals[`${id}:${key}`].execution
    );

    router.back();
  } finally {
    sending.value = false;
  }
}
</script>
<template>
  <div>
    <nav class="border-b bg-skin-bg fixed top-0 z-10 right-0 left-0 lg:left-[72px]">
      <div class="flex items-center h-[71px] mx-4">
        <div class="flex-auto space-x-2">
          <router-link :to="{ name: 'overview', params: { id } }" class="mr-2">
            <UiButton class="leading-3 w-[46px] !px-0">
              <IH-arrow-narrow-left class="inline-block" />
            </UiButton>
          </router-link>
          <h4 class="py-2 inline-block">New proposal</h4>
        </div>
        <PendingTransactionsIndicator class="mr-2" />
        <UiLoading v-if="!space" class="block p-4" />
        <div v-else class="space-x-2">
          <UiButton class="float-left leading-3 !px-3 rounded-r-none" @click="modalOpen = true">
            <IH-collection class="inline-block" />
          </UiButton>
          <UiButton
            class="rounded-l-none border-l-0 float-left !m-0 !px-3"
            :loading="sending"
            @click="handleProposeClick"
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
