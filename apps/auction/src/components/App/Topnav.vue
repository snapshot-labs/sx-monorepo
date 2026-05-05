<script setup lang="ts">
import { getCacheHash, shorten } from '@/helpers/utils';

defineProps<{
  hasAppNav: boolean;
}>();

const route = useRoute();
const usersStore = useUsersStore();
const { modalAccountOpen, resetAccountModal } = useModal();
const { logout, web3 } = useWeb3();
const { toggleTheme, currentTheme } = useTheme();

const user = computed(
  () =>
    usersStore.getUser(web3.value.account) || {
      id: web3.value.account,
      name: web3.value.name,
      avatar: undefined
    }
);
const cb = computed(() => getCacheHash(user.value.avatar));

onUnmounted(() => {
  resetAccountModal();
});
</script>

<template>
  <UiTopnav v-bind="$attrs">
    <div class="flex-grow pl-4">
      <AppLink :to="{ name: 'auctions' }" class="inline-block">
        <IC-snapshot class="size-[28px] text-skin-link" />
      </AppLink>
    </div>

    <div class="flex space-x-2 shrink-0">
      <UiButton v-if="web3.authLoading" loading />
      <UiDropdown v-else-if="web3.account" :key="route.fullPath">
        <template #button>
          <UiButton class="sm:w-auto !px-0 sm:!px-3">
            <span
              class="sm:flex items-center space-x-2"
              data-testid="profile-button"
            >
              <UiStamp :id="user.id" :size="18" :cb="cb" />
              <span
                class="hidden sm:block truncate max-w-[120px]"
                v-text="user.name || shorten(user.id)"
              />
            </span>
          </UiButton>
        </template>
        <template v-if="web3.account" #items>
          <UiDropdownItem @click="modalAccountOpen = true">
            <IH-switch-horizontal />
            Change wallet
          </UiDropdownItem>
          <hr class="bg-skin-text/20 h-[2px]" />
          <UiDropdownItem class="!text-skin-danger" @click="logout()">
            <IH-logout />
            Log out
          </UiDropdownItem>
        </template>
      </UiDropdown>
      <UiButton
        v-else
        class="sm:w-auto !px-0 sm:!px-3"
        @click="modalAccountOpen = true"
      >
        <span class="hidden sm:block" v-text="'Log in'" />
        <IH-login class="sm:hidden inline-block" />
      </UiButton>
      <IndicatorPendingTransactions />
      <UiButton uniform @click="toggleTheme()">
        <IH-sun v-if="currentTheme === 'dark'" />
        <IH-moon v-else />
      </UiButton>
    </div>
  </UiTopnav>
</template>
