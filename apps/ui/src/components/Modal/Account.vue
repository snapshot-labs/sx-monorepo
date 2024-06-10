<script setup lang="ts">
import { getInjected } from '@snapshot-labs/lock/src/utils';
import connectors, { mapConnectorId, getConnectorIconUrl } from '@/helpers/connectors';

const win = window;

const injected = getInjected();
if (injected)
  connectors['injected'] = {
    ...connectors['injected'],
    ...injected,
    id: 'injected',
    icon: connectors[mapConnectorId(injected.id)]?.icon ?? injected.icon
  };

const props = defineProps<{
  open: boolean;
}>();
const emit = defineEmits<{
  (e: 'login', connector: string): void;
  (e: 'close'): void;
}>();

const { open } = toRefs(props);
const { web3, logout } = useWeb3();
const step: Ref<'connect' | null> = ref(null);

const availableConnectors = computed(() => {
  return Object.values(connectors).filter(connector => {
    const hasNoType = !('type' in connector) || !connector.type;
    const isActive =
      'type' in connector &&
      'root' in connector &&
      connector.type === 'injected' &&
      win[connector.root];

    return hasNoType || isActive;
  });
});

async function handleLogout() {
  await logout();
  emit('close');
}

watch(open, () => (step.value = null));
</script>

<template>
  <UiModal :open="open" @close="$emit('close')">
    <template #header>
      <h3 v-if="!web3.account || step === 'connect'" v-text="'Connect wallet'" />
      <h3 v-else v-text="'Account'" />
    </template>
    <div v-if="!web3.account || step === 'connect'">
      <div class="m-4 space-y-2">
        <a
          v-for="connector in availableConnectors"
          :key="connector.id"
          target="_blank"
          class="block"
          @click="$emit('login', connector.id)"
        >
          <UiButton class="button-outline w-full flex justify-center items-center">
            <img
              :src="getConnectorIconUrl(connector.icon)"
              height="28"
              width="28"
              class="mr-2 -mt-1"
              :alt="connector.name"
            />
            {{ connector.name }}
          </UiButton>
        </a>
      </div>
    </div>
    <div v-else>
      <div class="m-4 space-y-2">
        <router-link
          :to="{ name: 'user', params: { id: web3.account } }"
          class="block"
          tabindex="-1"
        >
          <UiButton
            class="button-outline w-full flex justify-center items-center space-x-2"
            @click="emit('close')"
          >
            <UiStamp :id="web3.account" :size="18" />
            <span>My profile</span>
          </UiButton>
        </router-link>
        <router-link to="/settings" class="block" tabindex="-1">
          <UiButton
            class="button-outline w-full flex justify-center items-center"
            @click="emit('close')"
          >
            <span>Settings</span>
          </UiButton>
        </router-link>
        <UiButton class="button-outline w-full" @click="step = 'connect'">
          {{ web3.account ? 'Change wallet' : 'Connect wallet' }}
        </UiButton>
        <UiButton class="button-outline w-full !text-skin-danger" @click="handleLogout">
          Log out
        </UiButton>
      </div>
    </div>
  </UiModal>
</template>
