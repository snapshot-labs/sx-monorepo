<script setup lang="ts">
import { getCacheHash } from '@/helpers/utils';
import { Connector } from '@/networks/types';

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  (e: 'login', connector: Connector): void;
  (e: 'close'): void;
}>();

const { open } = toRefs(props);
const { web3, logout } = useWeb3();
const usersStore = useUsersStore();

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
    <UiCol :gap="8" class="m-4">
      <Connectors
        v-if="isLoggedOut"
        @click="(connector: Connector) => emit('login', connector)"
      />
      <template v-else>
        <UiButton
          :to="{ name: 'user', params: { user: web3.account } }"
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
    </UiCol>
  </UiModal>
</template>
