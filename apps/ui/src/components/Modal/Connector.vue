<script setup lang="ts">
import { getValidator } from '@/helpers/validation';
import { Connector, ConnectorType } from '@/networks/types';

const GUEST_ACCOUNT_DEFINITION = {
  type: 'string',
  format: 'ens-or-address',
  title: 'Guest account',
  examples: ['Address or ENS']
};

defineProps<{
  open: boolean;
  supportedConnectors?: ConnectorType[];
}>();
const emit = defineEmits<{
  (e: 'pick', connector: Connector): void;
  (e: 'close'): void;
}>();

const { web3 } = useWeb3();
const router = useRouter();

const isGuestFormVisible = ref(false);
const isFormValid = ref(false);
const guestAddress = ref('');
const formErrors = ref({} as Record<string, any>);

async function handleGuestLogin() {
  if (!guestAddress.value) return;

  const value = guestAddress.value;

  router.push({
    query: { ...router.currentRoute.value.query, as: value }
  });
  isGuestFormVisible.value = false;
  emit('close');
}

function handleConnectorClick(connector: Connector) {
  if (connector.type === 'guest') {
    isGuestFormVisible.value = true;
  } else {
    emit('pick', connector);
  }
}

function handleClose() {
  isGuestFormVisible.value = false;
  emit('close');
}

watch(isGuestFormVisible, () => {
  guestAddress.value = '';
});

watchEffect(async () => {
  isFormValid.value = false;

  const validator = getValidator({
    $async: true,
    type: 'object',
    additionalProperties: false,
    required: ['account'],
    properties: {
      account: GUEST_ACCOUNT_DEFINITION
    }
  });

  formErrors.value = await validator.validateAsync({
    account: guestAddress.value
  });

  isFormValid.value = Object.keys(formErrors.value).length === 0;
});
</script>

<template>
  <UiModal :open="open" @close="handleClose">
    <template #header>
      <h3
        v-text="
          isGuestFormVisible
            ? 'Log in as guest'
            : web3.account
              ? 'Change wallet'
              : 'Log in'
        "
      />
      <button
        v-if="isGuestFormVisible"
        type="button"
        class="absolute left-0 -top-1 p-4"
        @click="isGuestFormVisible = false"
      >
        <IH-arrow-narrow-left class="mr-2" />
      </button>
    </template>
    <div v-if="isGuestFormVisible" class="s-box p-4">
      <UiInputString
        v-model="guestAddress"
        autofocus
        :error="formErrors.account"
        :definition="GUEST_ACCOUNT_DEFINITION"
        @keydown.enter="handleGuestLogin"
      />
    </div>
    <div v-else class="m-4">
      <Connectors
        :supported-connectors="supportedConnectors"
        @click="handleConnectorClick"
      />
    </div>
    <template v-if="isGuestFormVisible" #footer>
      <UiButton
        class="w-full"
        primary
        :disabled="!isFormValid"
        @click="handleGuestLogin"
      >
        Log in
      </UiButton>
    </template>
  </UiModal>
</template>
