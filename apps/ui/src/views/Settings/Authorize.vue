<script setup lang="ts">
const route = useRoute();
const router = useRouter();
const { web3, web3Account } = useWeb3();

const aliasAddress = computed(() => (route.params.address as string) || '');
const {
  isAuthorizing,
  isJustAuthorized,
  error,
  isAlreadyAuthorized,
  isCheckingAlias,
  isValidAddress,
  isSelfAlias,
  checksumAddress,
  authorize
} = useAliasAuthorize(aliasAddress);

const isLoading = computed(
  () => web3.value.authLoading || isCheckingAlias.value
);
const hasHistory = computed(() => !!window.history.state?.back);

const redirectUri = computed(() => route.query.redirect_uri as string | undefined);
const countdown = ref(0);

watch(isJustAuthorized, val => {
  if (val && redirectUri.value) {
    countdown.value = 3;
    const interval = setInterval(() => {
      countdown.value--;
      if (countdown.value <= 0) {
        clearInterval(interval);
        window.location.href = redirectUri.value!;
      }
    }, 1000);
  }
});
</script>

<template>
  <UiStateWarning v-if="!isValidAddress" class="px-4 py-3">
    Invalid alias address
  </UiStateWarning>
  <UiStateWarning v-else-if="isSelfAlias" class="px-4 py-3">
    You cannot authorize your own address as an alias
  </UiStateWarning>
  <div
    v-else
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
              :id="checksumAddress"
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
          <div class="p-4 space-y-4">
            <div class="text-[20px] text-skin-link text-center">
              <template v-if="isJustAuthorized">
                <UiAddress
                  :address="checksumAddress"
                  copy-button="always"
                  class="inline-flex font-bold"
                />
                has been successfully authorized to perform actions on your behalf.
                <div v-if="redirectUri" class="mt-2 text-skin-text text-[16px]">
                  Redirecting in {{ countdown }}s...
                </div>
              </template>
              <template v-else-if="isAlreadyAuthorized">
                The alias
                <UiAddress
                  :address="checksumAddress"
                  copy-button="always"
                  class="inline-flex font-bold"
                />
                is already authorized to perform actions on your behalf.
              </template>
              <template v-else>
                Do you want to authorize
                <UiAddress
                  :address="checksumAddress"
                  copy-button="always"
                  class="inline-flex font-bold"
                />
                to perform the following actions on your behalf?
              </template>
            </div>

            <div v-if="!isAlreadyAuthorized" class="border rounded-lg overflow-hidden">
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

            <div v-if="!isAlreadyAuthorized" class="text-skin-text text-center">
              You can revoke this alias at any time.
            </div>

            <UiAlert v-if="error" type="error">{{ error }}</UiAlert>
          </div>
        </template>
      </div>

      <div v-if="!isLoading" class="border-t p-4 mt-auto md:mt-0">
        <UiButton
          v-if="isAlreadyAuthorized"
          disabled
          class="w-full hover:border-skin-danger"
        >
          <span class="text-skin-danger">Revoke alias</span>
        </UiButton>
        <div v-else class="w-full flex justify-between space-x-[10px]">
          <UiButton v-if="hasHistory" class="w-full" @click="router.back()">
            Cancel
          </UiButton>
          <UiButton
            primary
            class="w-full"
            :loading="isAuthorizing"
            @click="authorize()"
          >
            Authorize
          </UiButton>
        </div>
      </div>
    </div>
  </div>
</template>
