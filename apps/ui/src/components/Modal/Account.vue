<script setup>
import { toRefs, watch } from 'vue';
import { getInjected } from '@snapshot-labs/lock/src/utils';
import { shorten, explorerUrl, getUrl } from '@/helpers/utils';
import connectors from '@/helpers/connectors.json';
import { useWeb3 } from '@/composables/useWeb3';

const injected = getInjected();
if (injected)
  connectors['injected'] = {
    ...connectors['injected'],
    ...injected,
    ...{ id: 'injected' }
  };

const props = defineProps({ open: Boolean });
const emit = defineEmits(['login', 'close']);
const win = window;

const { open } = toRefs(props);
const { web3, logout } = useWeb3();
let step = $ref(null);

async function handleLogout() {
  await logout();
  emit('close');
}

watch(open, () => (step = null));
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
          v-for="(connector, id, i) in connectors"
          :key="i"
          target="_blank"
          class="block"
          @click="$emit('login', connector.id)"
        >
          <UiButton
            v-if="(connector.type === 'injected' && win[connector.root]) || !connector.type"
            class="button-outline w-full flex justify-center items-center"
          >
            <img
              :src="getUrl(connector.icon)"
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
      <div v-if="$auth.isAuthenticated.value" class="m-4 space-y-2">
        <a :href="explorerUrl(web3.network.key, web3.account)" target="_blank" class="block">
          <UiButton class="button-outline w-full flex justify-center items-center">
            <Stamp :id="web3.account" :size="18" class="mr-2 -ml-1" />
            <span v-text="web3.name || shorten(web3.account)" />
            <IH-external-link class="inline-block ml-1" />
          </UiButton>
        </a>
        <UiButton class="button-outline w-full" @click="step = 'connect'">
          Connect wallet
        </UiButton>
        <UiButton class="button-outline w-full !text-red" @click="handleLogout"> Log out </UiButton>
      </div>
    </div>
  </UiModal>
</template>
