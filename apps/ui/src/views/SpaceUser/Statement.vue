<script setup lang="ts">
import { enabledNetworks, getNetwork, offchainNetworks } from '@/networks';
import type { Space, Statement } from '@/types';

const offchainNetworkId = offchainNetworks.filter(network => enabledNetworks.includes(network))[0];
const offchainNetwork = getNetwork(offchainNetworkId);

const props = defineProps<{ space: Space }>();

const route = useRoute();
const { web3 } = useWeb3();

const isEditMode = ref(false);
const loading = ref(false);
const statement = ref<Statement | null>(null);

const userId = computed(() => route.params.user as string);

async function loadStatement() {
  loading.value = true;

  try {
    statement.value = (await offchainNetwork.api.loadStatement(
      props.space.network,
      props.space.id,
      userId.value
    )) || {
      space: props.space.id,
      network: props.space.network,
      about: '',
      statement: '',
      status: 'inactive',
      discourse: ''
    };
  } finally {
    loading.value = false;
  }
}

watch(userId, loadStatement, { immediate: true });
</script>

<template>
  <div class="p-4">
    <UiLoading v-if="loading" class="block" />
    <template v-else-if="statement">
      <EditorStatement v-if="isEditMode" v-model="statement" @close="isEditMode = false" />
      <div v-else>
        <div class="relative mb-2.5">
          <div class="inline-block border rounded-full pl-2 pr-[10px] pb-0.5 text-skin-heading">
            <template v-if="statement.status === 'active'">
              <IS-status-online class="text-skin-success inline-block w-[17px] h-[17px] mb-[1px]" />
              Active
            </template>
            <template v-else>
              <div class="h-[8px] w-[8px] mx-[4px] bg-gray-500 rounded-full inline-block" />
              Inactive
            </template>
          </div>
          <UiTooltip v-if="web3.account === userId" title="Edit" class="!absolute right-0">
            <UiButton class="!px-0 w-[46px]" @click="isEditMode = true">
              <IH-pencil class="inline-block" />
            </UiButton>
          </UiTooltip>
        </div>
        <UiMarkdown
          v-if="statement.statement"
          class="text-skin-heading max-w-[592px]"
          :body="statement.statement"
        />
      </div>
    </template>
    <div v-else class="flex items-center space-x-2">
      <IH-exclamation-circle class="inline-block" />
      <span>Error while loading statement</span>
    </div>
  </div>
</template>
