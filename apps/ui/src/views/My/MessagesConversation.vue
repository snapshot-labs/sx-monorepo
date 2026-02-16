<script setup lang="ts">
import { _rt, shortenAddress } from '@/helpers/utils';

const route = useRoute();
const router = useRouter();
const { web3 } = useWeb3();
const { setTitle } = useTitle();
const {
  inboxId,
  isReady,
  isActivated,
  init,
  getMessages,
  getPeerName,
  loadMessages,
  messagesLoading,
  messagesError,
  sendMessageToPeer,
  markConversationRead
} = useXmtp();

init();

const peerAddress = computed(() => route.params.address as string);
const messages = computed(() => getMessages(peerAddress.value));
const peerName = computed(() => getPeerName(peerAddress.value));

const pendingMessages = ref<
  { id: string; content: string; sentAt: Date; status: 'sending' | 'failed' }[]
>([]);
const messageText = ref('');

const allMessages = computed(() => [
  ...messages.value.map(m => ({
    ...m,
    status: undefined as string | undefined
  })),
  ...pendingMessages.value.map(m => ({
    ...m,
    senderInboxId: inboxId.value,
    kind: 'optimistic' as string | number
  }))
]);

setTitle('Conversation');

// Load messages when XMTP ready + peer changes
watch(
  [isReady, peerAddress],
  ([ready]) => {
    if (ready) loadMessages(peerAddress.value);
  },
  { immediate: true }
);

async function handleSend() {
  const text = messageText.value.trim();
  if (!text) return;

  const tempId = `pending-${Date.now()}`;
  pendingMessages.value = [
    ...pendingMessages.value,
    {
      id: tempId,
      content: text,
      sentAt: new Date(),
      status: 'sending' as const
    }
  ];
  messageText.value = '';
  scrollToBottom(true);

  try {
    await sendMessageToPeer(peerAddress.value, text);
    pendingMessages.value = pendingMessages.value.filter(m => m.id !== tempId);
  } catch {
    pendingMessages.value = pendingMessages.value.map(m =>
      m.id === tempId ? { ...m, status: 'failed' as const } : m
    );
  }
}

function scrollToBottom(force = false) {
  if (
    !force &&
    window.innerHeight + window.scrollY < document.body.scrollHeight - 150
  )
    return;
  nextTick(() => window.scrollTo({ top: document.body.scrollHeight }));
}

function isOwnMessage(message: any): boolean {
  return message.senderInboxId === inboxId.value;
}

// Redirect if not connected or not activated (after auth resolves)
watch(
  [() => web3.value.account, () => web3.value.authLoading],
  ([account, authLoading]) => {
    if (authLoading) return;
    if (!account || !isActivated.value) {
      router.replace({ name: 'my-messages' });
    }
  }
);

// Mark as read + scroll when messages become available or update
watch(messages, msgs => {
  if (msgs.length) {
    markConversationRead(peerAddress.value);
    scrollToBottom();
  }
});

// Always scroll to bottom when entering the conversation
onMounted(() => {
  if (messages.value.length) {
    markConversationRead(peerAddress.value);
  }
  nextTick(() => scrollToBottom(true));
});
</script>

<template>
  <div class="flex flex-col min-h-[calc(100vh-72px)] !pb-0">
    <!-- Header -->
    <div
      class="border-b py-2.5 px-4 flex items-center sticky z-20 top-header-height-with-offset lg:top-header-height bg-skin-bg gap-3"
    >
      <UiButton :to="{ name: 'my-messages' }" class="shrink-0" uniform>
        <IH-arrow-narrow-left />
      </UiButton>
      <div class="flex items-center gap-2 flex-1 truncate">
        <UiStamp
          v-if="peerAddress"
          :id="peerAddress"
          type="avatar"
          :size="24"
        />
        <h4 class="grow truncate">
          {{ peerName || shortenAddress(peerAddress) }}
        </h4>
      </div>
      <UiTooltip title="View profile">
        <UiButton
          :to="{ name: 'user', params: { user: peerAddress } }"
          class="shrink-0"
          uniform
        >
          <IH-user-circle />
        </UiButton>
      </UiTooltip>
    </div>

    <!-- Loading (only on first load) -->
    <UiLoading v-if="messagesLoading" class="block px-4 py-3 flex-1" />

    <!-- Error -->
    <UiStateWarning v-else-if="messagesError" class="px-4 py-3 flex-1">
      {{ messagesError }}
    </UiStateWarning>

    <!-- Conversation -->
    <template v-else>
      <!-- Spacer to push messages to the bottom -->
      <div class="flex-1" />

      <!-- Peer profile header -->
      <div class="flex flex-col items-center py-6">
        <AppLink :to="{ name: 'user', params: { user: peerAddress } }">
          <UiStamp :id="peerAddress" type="avatar" :size="90" class="mb-2" />
        </AppLink>
        <h1 class="break-words">
          {{ peerName || shortenAddress(peerAddress) }}
        </h1>
        <UiAddress :address="peerAddress" copy-button="always" />
      </div>

      <!-- Messages -->
      <div class="px-4 py-3 pb-6 space-y-3">
        <div
          v-for="msg in allMessages"
          :key="msg.id"
          class="flex"
          :class="isOwnMessage(msg) ? 'justify-end' : 'justify-start'"
        >
          <div
            class="max-w-[75%] rounded-2xl px-3 py-2 break-words"
            :class="[
              isOwnMessage(msg)
                ? 'bg-skin-border text-skin-link'
                : 'bg-skin-border/40 text-skin-link',
              msg.status === 'sending' ? 'opacity-60' : '',
              msg.status === 'failed' ? 'opacity-60 !bg-red' : ''
            ]"
          >
            <div>{{ msg.content }}</div>
            <div
              class="text-xs mt-0.5 opacity-60 flex items-center gap-1 text-skin-text"
            >
              <template v-if="msg.status === 'sending'">Sending...</template>
              <template v-else-if="msg.status === 'failed'">
                Failed to send
              </template>
              <template v-else>
                {{ _rt(Math.floor(msg.sentAt.getTime() / 1000)) }}
              </template>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Input area (always visible) -->
    <div class="border-t px-4 py-3 bg-skin-bg sticky bottom-0 z-10">
      <div class="s-box flex gap-2 !w-full">
        <div class="flex-1">
          <UiInputString
            v-model="messageText"
            class="!py-2 !px-2.5 !mb-0"
            :definition="{ examples: ['Message'] }"
            @keyup.enter="handleSend"
          />
        </div>
        <UiButton
          primary
          :disabled="!messageText.trim()"
          class="!h-[42px]"
          @click="handleSend"
        >
          Send
        </UiButton>
      </div>
    </div>
  </div>
</template>
