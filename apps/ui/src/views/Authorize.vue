<script setup lang="ts">
import { isUserAbortError } from '@/helpers/utils';
import { getNetwork, metadataNetwork } from '@/networks';

const { web3, web3Account, auth } = useWeb3();
const { modalAccountOpen } = useModal();

const loading = ref(false);
const error = ref<string | null>(null);
const alreadyAuthorized = ref(false);
const checkingAlias = ref(!!web3Account.value);

const aliasAddress = computed(
  () => (useRoute().params.address as string) || ''
);
const isLoading = computed(() => web3.value.authLoading || checkingAlias.value);

async function checkExistingAlias() {
  if (!web3Account.value || !aliasAddress.value) return;

  checkingAlias.value = true;
  try {
    const network = getNetwork(metadataNetwork);
    const existing = await network.api.loadAlias(
      web3Account.value,
      aliasAddress.value,
      0
    );
    alreadyAuthorized.value = !!existing;
  } catch {
    alreadyAuthorized.value = false;
  } finally {
    checkingAlias.value = false;
  }
}

watch(
  web3Account,
  () => {
    alreadyAuthorized.value = false;
    error.value = null;
    checkExistingAlias();
  },
  { immediate: true }
);

const router = useRouter();

function cancel() {
  router.push({ name: 'my-explore' });
}

async function authorize() {
  if (!auth.value) return;

  loading.value = true;
  error.value = null;

  try {
    const network = getNetwork(metadataNetwork);
    const envelope = await network.actions.setAlias(
      auth.value!.provider,
      aliasAddress.value
    );
    await network.actions.send(envelope);
    alreadyAuthorized.value = true;
  } catch (err: any) {
    if (!isUserAbortError(err)) {
      error.value = err.message || 'Authorization failed';
    }
    loading.value = false;
  }
}
</script>

<template>
  <div
    class="flex flex-col min-h-[calc(100vh-72px)] !pb-0 md:!pb-8 md:items-center md:justify-center md:pt-4"
  >
    <div
      class="mx-auto flex flex-col grow md:grow-0 md:border rounded-none md:rounded-lg md:h-fit md:max-w-[440px] w-full"
    >
      <div class="border-b py-3 text-center">
        <h3>Authorize alias</h3>
      </div>

      <div>
        <div class="bg-skin-border w-full h-[140px]" />
        <div class="-mt-[64px] flex flex-col items-center">
          <div class="flex items-center justify-center">
            <UiStamp
              v-if="web3Account"
              :id="web3Account"
              :size="80"
              class="border-4 border-skin-bg relative z-[1]"
            />
            <UiStamp
              :id="aliasAddress"
              :size="80"
              class="border-4 border-skin-bg"
              :class="web3Account ? '-ml-3' : ''"
            />
          </div>
        </div>

        <div v-if="isLoading" class="flex items-center justify-center py-6">
          <UiLoading />
        </div>

        <template v-else>
          <div class="px-4 pt-4 pb-4 text-[20px] text-skin-link text-center">
            <template v-if="alreadyAuthorized">
              The alias
              <UiAddress
                :address="aliasAddress"
                copy-button="always"
                class="inline-flex text-[20px] font-bold"
              />
              is already authorized to perform actions on your behalf.
            </template>
            <template v-else>
              Do you want to authorize
              <UiAddress
                :address="aliasAddress"
                copy-button="always"
                class="inline-flex text-[20px] font-bold"
              />
              to perform the following actions on your behalf?
            </template>
          </div>

          <div v-if="!alreadyAuthorized" class="px-4 pb-4 space-y-4">
            <div class="border rounded-lg overflow-hidden">
              <div class="flex items-center gap-2 px-4 py-2.5 text-skin-link">
                <IH-check class="text-skin-success shrink-0 size-[16px]" />
                <span>Cast a vote</span>
              </div>
              <div
                class="flex items-center gap-2 px-4 py-2.5 text-skin-link border-t"
              >
                <IH-check class="text-skin-success shrink-0 size-[16px]" />
                <span>Publish a proposal</span>
              </div>
            </div>

            <div class="text-skin-text text-center">
              You can revoke this alias at any time.
            </div>
          </div>

          <div v-if="error" class="px-4 pb-4">
            <UiAlert type="error">{{ error }}</UiAlert>
          </div>
        </template>
      </div>

      <div v-if="!isLoading" class="border-t p-4 mt-auto md:mt-0">
        <UiButton
          v-if="alreadyAuthorized"
          disabled
          class="w-full hover:border-skin-danger"
        >
          <span class="text-skin-danger">Revoke alias</span>
        </UiButton>
        <div v-else class="w-full flex justify-between space-x-[10px]">
          <UiButton class="w-full" @click="cancel"> Cancel </UiButton>
          <UiButton
            primary
            class="w-full"
            :loading="loading"
            @click="web3Account ? authorize() : (modalAccountOpen = true)"
          >
            Authorize
          </UiButton>
        </div>
      </div>
    </div>
  </div>
</template>
