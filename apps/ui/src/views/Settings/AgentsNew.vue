<script setup lang="ts">
import { getNetwork, metadataNetwork, offchainNetworks } from '@/networks';
import { useAgentDetailQuery } from '@/queries/agents';

const AGENT_URL = import.meta.env.VITE_AGENT_URL || 'http://localhost:3002';

const NAME_DEFINITION = {
  type: 'string',
  title: 'Name',
  maxLength: 64,
  examples: ['My voting agent']
};

const SOUL_DEFINITION = {
  type: 'string',
  format: 'long',
  title: 'General instructions',
  maxLength: 10000,
  examples: ['Describe your agent personality and voting philosophy…']
};

const CONTEXT_DEFINITION = {
  type: 'string',
  title: 'Context',
  maxLength: 4096,
  examples: ['Space-specific voting instructions…']
};

const route = useRoute();
const router = useRouter();
const { auth, web3Account } = useWeb3();
const network = getNetwork(metadataNetwork);
const followedSpacesStore = useFollowedSpacesStore();

const isEditMode = computed(() => route.name === 'settings-agent-edit');
const routeAgentAddress = computed(
  () => (route.params.agentAddress as string) || ''
);

useTitle(isEditMode.value ? 'Edit agent' : 'New agent');

const { data: existingAgent } = useAgentDetailQuery(routeAgentAddress);

const offchainSpaces = computed(() =>
  followedSpacesStore.followedSpaces.filter(s =>
    offchainNetworks.includes(s.network)
  )
);

const name = ref('My voting agent');
const soulMd = ref(
  'Vote NO on proposals that seem rushed, lack detail, or could harm the treasury.'
);
const contexts = ref<Record<string, string>>({});
const enabledSpaces = ref(new Set<string>());
const submitting = ref(false);
const agentAddress = ref('');
const isTransactionModalOpen = ref(false);

function toggleSpace(spaceId: string) {
  if (enabledSpaces.value.has(spaceId)) {
    enabledSpaces.value.delete(spaceId);
    delete contexts.value[spaceId];
  } else {
    enabledSpaces.value.add(spaceId);
  }
}

watch(
  existingAgent,
  agent => {
    if (!isEditMode.value || !agent) return;
    name.value = agent.name;
    soulMd.value = agent.soul_md;
    const ctxMap: Record<string, string> = {};
    const enabled = new Set<string>();
    for (const c of agent.contexts) {
      ctxMap[c.space_id] = c.context;
      enabled.add(c.space_id);
    }
    contexts.value = ctxMap;
    enabledSpaces.value = enabled;
  },
  { immediate: true }
);

function getContextEntries() {
  return [...enabledSpaces.value].map(spaceId => ({
    spaceId,
    context: contexts.value[spaceId]?.trim() || ''
  }));
}

async function handleSubmit() {
  submitting.value = true;
  try {
    if (isEditMode.value) {
      const res = await fetch(`${AGENT_URL}/agent`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentAddress: routeAgentAddress.value,
          name: name.value,
          soulMd: soulMd.value,
          contexts: getContextEntries()
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update agent');
      router.push({ name: 'settings-agents' });
    } else {
      const res = await fetch(`${AGENT_URL}/authorize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress: web3Account.value,
          name: name.value,
          soulMd: soulMd.value,
          contexts: getContextEntries()
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create agent');
      agentAddress.value = json.agentAddress;
      isTransactionModalOpen.value = true;
    }
  } catch (err) {
    alert(err instanceof Error ? err.message : 'Something went wrong');
  } finally {
    submitting.value = false;
  }
}

async function executeSetAlias() {
  const envelope = await network.actions.setAlias(
    auth.value!.provider,
    agentAddress.value
  );
  await network.actions.send(envelope);
  return null;
}

async function handleDelete() {
  await fetch(`${AGENT_URL}/authorize`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentAddress: routeAgentAddress.value })
  });
  router.push({ name: 'settings-agents' });
}

async function handleConfirmed() {
  await fetch(`${AGENT_URL}/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentAddress: agentAddress.value })
  });
  isTransactionModalOpen.value = false;
  router.push({
    name: 'settings-agent-detail',
    params: { agentAddress: agentAddress.value }
  });
}
</script>

<template>
  <UiContainer class="pt-5 !max-w-[730px]">
    <UiContainerSettings title="Name" description="Give your agent a name.">
      <div class="s-box">
        <UiInputString v-model="name" :definition="NAME_DEFINITION" />
      </div>
    </UiContainerSettings>

    <UiContainerSettings
      title="SOUL"
      description="General personality and voting philosophy for your agent."
      class="mt-6"
    >
      <div class="s-box">
        <UiComposer v-model="soulMd" :definition="SOUL_DEFINITION" />
      </div>
    </UiContainerSettings>

    <UiContainerSettings
      title="Space contexts"
      description="Add specific instructions for each space you follow."
      class="mt-6"
    >
      <UiLoading
        v-if="!followedSpacesStore.followedSpacesLoaded"
        class="block my-4"
      />
      <div v-else-if="offchainSpaces.length" class="space-y-3">
        <div
          v-for="space in offchainSpaces"
          :key="space.id"
          class="border border-skin-border rounded-lg"
        >
          <button
            type="button"
            class="flex items-center gap-3 w-full p-3"
            @click="toggleSpace(space.id)"
          >
            <SpaceAvatar :space="space" :size="32" class="!rounded-[4px]" />
            <span
              class="text-skin-link font-semibold flex-auto text-left"
              v-text="space.name"
            />
            <IH-check
              v-if="enabledSpaces.has(space.id)"
              class="text-skin-success shrink-0"
            />
          </button>
          <div v-if="enabledSpaces.has(space.id)" class="px-3 pb-3">
            <UiTextarea
              v-model="contexts[space.id]"
              :definition="CONTEXT_DEFINITION"
            />
          </div>
        </div>
      </div>
      <UiStateWarning v-else class="py-3">
        You are not following any spaces.
      </UiStateWarning>
    </UiContainerSettings>

    <div class="mt-6 flex gap-3">
      <UiButton
        :disabled="!name || !soulMd || submitting"
        :loading="submitting"
        primary
        @click="handleSubmit"
      >
        {{ isEditMode ? 'Save' : 'Create agent' }}
      </UiButton>
      <UiButton
        v-if="isEditMode"
        class="!text-skin-danger !border-skin-danger"
        @click="handleDelete"
      >
        Delete
      </UiButton>
    </div>

    <teleport to="#modal">
      <ModalTransactionProgress
        :open="isTransactionModalOpen"
        :chain-id="network.chainId"
        :execute="executeSetAlias"
        @confirmed="handleConfirmed"
        @close="isTransactionModalOpen = false"
        @cancelled="isTransactionModalOpen = false"
      />
    </teleport>
  </UiContainer>
</template>
