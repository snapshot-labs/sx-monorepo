<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSpacesStore } from '@/stores/spaces';
import { useActions } from '@/composables/useActions';
import { useEditor } from '@/composables/useEditor';
import { useModal } from '@/composables/useModal';
import { omit } from '@/helpers/utils';
import type { NetworkID } from '@/types';

const { proposals, createDraft } = useEditor();
const { modalOpen: globalModalOpen } = useModal();
const route = useRoute();
const router = useRouter();
const { propose } = useActions();
const spacesStore = useSpacesStore();

const id = route.params.id as string;
const [networkId, spaceId] = id.split(':');
const key = route.params.key as string;
const proposalKey = `${id}:${key}`;

const modalOpen = ref(false);
const sending = ref(false);

const space = computed(() => spacesStore.spacesMap.get(id));
const proposalData = computed(() => {
  if (!proposals[proposalKey]) return null;

  return JSON.stringify(omit(proposals[proposalKey], ['updatedAt']));
});

if (!proposals[proposalKey]) {
  createDraft(id, { id: key });
}

onMounted(() => {
  spacesStore.fetchSpace(spaceId, networkId as NetworkID);

  if (!key && route.name) {
    globalModalOpen.value = false;

    const draftId = createDraft(id);

    router.replace({
      name: route.name,
      params: { id, key: draftId }
    });
  }
});

watch(
  () => proposals[proposalKey],
  (to, from) => {
    if (from && !to) {
      router.replace({ name: 'editor' });
    }
  }
);

watch(proposalData, () => {
  if (!proposals[proposalKey]) return;

  proposals[proposalKey].updatedAt = Date.now();
});

async function handleProposeClick() {
  if (!space.value) return;

  sending.value = true;

  try {
    const result = await propose(
      space.value,
      proposals[`${id}:${key}`].title,
      proposals[`${id}:${key}`].body,
      proposals[`${id}:${key}`].discussion,
      proposals[`${id}:${key}`].execution
    );

    if (result) router.back();
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
    <Container v-if="proposals[proposalKey]" class="pt-5 s-box">
      <h4 class="eyebrow mb-3">Context</h4>
      <SIString
        v-model="proposals[proposalKey].title"
        :definition="{
          type: 'string',
          title: 'Title'
        }"
      />
      <div class="s-base mb-5">
        <div class="s-label" v-text="'Description'" />
        <textarea
          v-model="proposals[proposalKey].body"
          maxlength="280"
          class="s-input mb-3 h-[160px]"
        />
        <SIString
          v-model="proposals[proposalKey].discussion"
          :definition="{
            type: 'string',
            title: 'Discussion',
            examples: ['e.g. https://forum.balancer.fi/t/proposal…']
          }"
        />
        <Preview :url="proposals[proposalKey].discussion" />
      </div>
      <h4 class="eyebrow mb-3">Execution</h4>
      <BlockExecutionEditable v-model="proposals[proposalKey].execution" class="mb-4" />
    </Container>
    <teleport to="#modal">
      <ModalDrafts
        :open="modalOpen"
        :network-id="networkId"
        :space="spaceId"
        @close="modalOpen = false"
      />
    </teleport>
  </div>
</template>
