<script setup lang="ts">
import { shortenAddress } from '@/helpers/utils';

const { web3 } = useWeb3();
const { setTitle } = useTitle();
const router = useRouter();

const {
  isReady,
  isInitializing,
  isActivated,
  error,
  init,
  conversations,
  conversationsLoading,
  getUnreadCount
} = useXmtp();

if (isActivated.value) init();

const modalOpen = ref(false);

setTitle('Messages');

watch(
  [() => web3.value.account, () => web3.value.authLoading],
  ([account, authLoading]) => {
    if (!account && !authLoading) {
      router.replace({ name: 'my-explore' });
    }
  },
  { immediate: true }
);

function handleNewDm(address: string) {
  modalOpen.value = false;
  router.push({
    name: 'my-messages-conversation',
    params: { address }
  });
}
</script>

<template>
  <div>
    <!-- Still logging in or activated user reconnecting -->
    <div v-if="web3.authLoading || (isActivated && !isReady)" class="px-4 py-3">
      <UiLoading class="block" />
    </div>

    <template v-else>
      <!-- Top action bar -->
      <div class="p-4 flex">
        <UiButton
          v-if="!isActivated"
          primary
          :loading="isInitializing"
          @click="init"
        >
          Get started
        </UiButton>
        <div class="flex-auto" />
        <UiTooltip v-if="isReady" title="New message">
          <UiButton uniform @click="modalOpen = true">
            <IH-user-add />
          </UiButton>
        </UiTooltip>
      </div>

      <p v-if="error" class="px-4 pb-3 text-red text-sm">{{ error }}</p>

      <!-- Messages tab -->
      <div class="flex pl-4 border-b space-x-3">
        <UiLabel :is-active="true" text="Messages" />
      </div>

      <!-- Loading state (only on first load) -->
      <UiLoading v-if="conversationsLoading" class="px-4 py-3 block" />

      <!-- Conversation list -->
      <div v-else-if="conversations?.length">
        <AppLink
          v-for="convo in conversations"
          :key="convo.id"
          :to="{
            name: 'my-messages-conversation',
            params: { address: convo.peerAddress }
          }"
          class="border-b mx-4 py-3 flex items-center gap-x-3 leading-[22px]"
        >
          <UiStamp :id="convo.peerAddress" type="avatar" :size="32" />
          <div class="flex-1 overflow-hidden">
            <h4 class="text-skin-link truncate">
              {{ convo.peerName || shortenAddress(convo.peerAddress) }}
            </h4>
            <div v-if="convo.lastMessageText" class="!text-skin-text truncate">
              <span v-if="convo.lastMessageIsOwn">You: </span>
              {{ convo.lastMessageText }}
            </div>
          </div>
          <div
            v-if="convo.lastMessageTime"
            class="shrink-0 ml-2 self-start flex flex-col items-end gap-1"
          >
            <span class="text-[16px]" :style="{ color: 'rgba(var(--text))' }">
              <TimeRelative :time="convo.lastMessageTime" />
            </span>
            <span
              v-if="getUnreadCount(convo.peerAddress)"
              class="bg-skin-link text-skin-bg text-[13px] rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-1"
            >
              {{ getUnreadCount(convo.peerAddress) }}
            </span>
          </div>
        </AppLink>
      </div>

      <!-- Empty state -->
      <UiStateWarning v-else class="px-4 py-3">
        There are no chats here.
      </UiStateWarning>
    </template>

    <teleport to="#modal">
      <ModalNewMessage
        :open="modalOpen"
        @close="modalOpen = false"
        @start="handleNewDm"
      />
    </teleport>
  </div>
</template>
