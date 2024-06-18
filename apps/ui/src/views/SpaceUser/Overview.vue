<script setup lang="ts">
import { enabledNetworks, getNetwork, offchainNetworks } from '@/networks';
import { Space, Statement } from '@/types';

const offchainNetworkId = offchainNetworks.filter(network => enabledNetworks.includes(network))[0];
const offchainNetwork = getNetwork(offchainNetworkId);

const props = defineProps<{ space: Space }>();

const route = useRoute();

const loading = ref(false);
const statement = ref<Statement | null>(null);

const userId = computed(() => route.params.user as string);

async function loadStatement() {
  loading.value = true;

  try {
    statement.value = (await offchainNetwork.api.loadStatement(props.space.id, userId.value)) || {
      userId: userId.value,
      spaceId: props.space.id,
      network: props.space.network,
      about: '',
      statement: ''
    };
  } finally {
    loading.value = false;
  }
}

watch(userId, loadStatement, { immediate: true });
</script>

<template>
  <UiLoading v-if="loading" class="block p-4" />
  <div v-else-if="statement" class="m-4 text-skin-heading">{{ statement.statement }}</div>
  <div v-else class="px-4 py-3 flex items-center space-x-2">
    <IH-exclamation-circle class="inline-block" />
    <span>Error while loading statement</span>
  </div>
</template>
