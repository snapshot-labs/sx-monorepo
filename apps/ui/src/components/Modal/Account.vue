<script setup lang="ts">
import { getCacheHash } from '@/helpers/utils';
import { starknetNetworks } from '@/networks';
import {
  EVM_CONNECTORS,
  STARKNET_CONNECTORS
} from '@/networks/common/constants';
import { Connector } from '@/networks/types';

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  (e: 'login', connector: Connector): void;
  (e: 'close'): void;
}>();

const { web3, logout } = useWeb3();
const usersStore = useUsersStore();
const { space: whiteLabelSpace } = useWhiteLabel();

const { open } = toRefs(props);
const step: Ref<'connect' | null> = ref(null);

const user = computed(
  () =>
    usersStore.getUser(web3.value.account) || {
      id: web3.value.account,
      avatar: undefined
    }
);

const cb = computed(() => getCacheHash(user.value.avatar));

const isLoggedOut = computed(
  () => !web3.value.account || step.value === 'connect'
);

const supportedConnectorType = computed(() => {
  if (
    !whiteLabelSpace.value ||
    starknetNetworks.includes(whiteLabelSpace.value.network)
  )
    return Array.from(new Set(EVM_CONNECTORS.concat(STARKNET_CONNECTORS)));

  return EVM_CONNECTORS;
});

async function handleLogout() {
  await logout();
  emit('close');
}

watch(open, () => (step.value = null));
</script>

<template>
  <UiModal :open="open" @close="emit('close')">
    <template #header>
      <h3 v-text="isLoggedOut ? 'Log in' : 'Account'" />
    </template>
    <div class="m-4 flex flex-col gap-2">
      <Connectors
        v-if="isLoggedOut"
        :supported-connectors="supportedConnectorType"
        @click="(connector: Connector) => emit('login', connector)"
      />
      <template v-else>
        <UiButton
          :to="{ name: 'user', params: { user: web3.account } }"
          class="gap-2"
          @click="emit('close')"
        >
          <UiStamp :id="user.id" :size="18" :cb="cb" />
          My profile
        </UiButton>
        <UiButton :to="{ name: 'settings-spaces' }" @click="emit('close')">
          Settings
        </UiButton>
        <UiButton @click="step = 'connect'">
          {{ web3.account ? 'Change wallet' : 'Log in' }}
        </UiButton>
        <UiButton class="!text-skin-danger" @click="handleLogout">
          Log out
        </UiButton>
      </template>
    </div>
  </UiModal>
</template>
