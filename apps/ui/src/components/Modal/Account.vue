<script setup lang="ts">
import { getInjected } from '@snapshot-labs/lock/src/utils';
import connectors, {
  getConnectorIconUrl,
  mapConnectorId
} from '@/helpers/connectors';
import { getCacheHash } from '@/helpers/utils';

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
const usersStore = useUsersStore();
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

async function handleLogout() {
  await logout();
  emit('close');
}

watch(open, () => (step.value = null));
</script>

<template>
  <UiModal :open="open" @close="$emit('close')">
    <template #header>
      <h3 v-text="isLoggedOut ? 'Connect wallet' : 'Account'" />
    </template>
    <div class="m-4 flex flex-col gap-2">
      <template v-if="isLoggedOut">
        <button
          v-for="connector in availableConnectors"
          :key="connector.id"
          type="button"
          @click="$emit('login', connector.id)"
        >
          <UiButton class="w-full flex justify-center items-center gap-2">
            <img
              :src="getConnectorIconUrl(connector.icon)"
              height="28"
              width="28"
              :alt="connector.name"
            />
            {{ connector.name }}
          </UiButton>
        </button>
      </template>
      <template v-else>
        <AppLink
          :to="{ name: 'user', params: { user: web3.account } }"
          class="block"
          tabindex="-1"
        >
          <UiButton
            class="w-full flex justify-center items-center gap-2"
            @click="emit('close')"
          >
            <UiStamp :id="user.id" :size="18" :cb="cb" />
            My profile
          </UiButton>
        </AppLink>
        <AppLink :to="{ name: 'settings-spaces' }" tabindex="-1">
          <UiButton
            class="w-full flex justify-center items-center"
            @click="emit('close')"
          >
            Settings
          </UiButton>
        </AppLink>
        <UiButton @click="step = 'connect'">
          {{ web3.account ? 'Change wallet' : 'Connect wallet' }}
        </UiButton>
        <UiButton class="!text-skin-danger" @click="handleLogout">
          Log out
        </UiButton>
      </template>
    </div>
  </UiModal>
</template>
