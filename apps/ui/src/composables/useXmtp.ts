import {
  Client as ClientType,
  DecodedMessage,
  Signer
} from '@xmtp/browser-sdk';
import { getNames } from '@/helpers/stamp';
import pkg from '../../package.json';

function loadSdk() {
  return import('@xmtp/browser-sdk');
}

function textOf(content: unknown): string {
  return typeof content === 'string' ? content : String(content);
}

export type ConversationPreview = {
  id: string;
  peerAddress: string;
  peerName: string;
  lastMessageText: string;
  lastMessageTime: number; // unix seconds
  lastMessageIsOwn: boolean;
};

export type MessageItem = {
  id: string;
  content: unknown;
  senderInboxId: string;
  sentAt: Date;
  kind: number | string;
};

// XMTP classes use private fields (#field) which break with Vue's deep
// reactive Proxy. Use shallowRef + markRaw so Vue never wraps them.
const xmtpClient = shallowRef<ClientType | null>(null);
const isInitializing = ref(false);
const error = ref<string | null>(null);

// Module-level stream state
let activeStream: { end: () => void } | null = null;
let messageHandler:
  | ((item: MessageItem, conversationId: string) => void)
  | null = null;

// Persistent per-conversation unread message counts: { "account:peerAddress": count }
const unreadCounts = useStorage(
  `${pkg.name}.messages.unread-counts`,
  {} as Record<string, number>
);

// Persistent per-account flag: true once the user has visited Messages at least once
const xmtpActivated = useStorage(
  `${pkg.name}.messages.activated`,
  {} as Record<string, boolean>
);

// Data state (replaces TanStack Query)
const conversations = ref<ConversationPreview[]>([]);
const conversationsLoading = ref(false);
const messageCache = ref<
  Record<string, { messages: MessageItem[]; peerName: string }>
>({});
const messagesLoading = ref(false);
const messagesError = ref<string | null>(null);

function hexToBytes(hex: string): Uint8Array {
  const cleaned = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(cleaned.length / 2);
  for (let i = 0; i < cleaned.length; i += 2) {
    bytes[i / 2] = parseInt(cleaned.substring(i, i + 2), 16);
  }
  return bytes;
}

async function getEthId(address: string) {
  const { IdentifierKind } = await loadSdk();
  return {
    identifier: address.toLowerCase(),
    identifierKind: IdentifierKind.Ethereum
  };
}

async function getOrCreateDm(peerAddress: string) {
  if (!xmtpClient.value) return null;
  const id = await getEthId(peerAddress);
  const existing = await xmtpClient.value.conversations.fetchDmByIdentifier(id);
  if (existing) return markRaw(existing);
  const created =
    await xmtpClient.value.conversations.createDmWithIdentifier(id);
  return markRaw(created);
}

async function startMessageStream() {
  if (activeStream || !xmtpClient.value) return;
  const { ConsentState, GroupMessageKind } = await loadSdk();

  activeStream = await xmtpClient.value.conversations.streamAllDmMessages({
    consentStates: [ConsentState.Allowed, ConsentState.Unknown],
    onValue: (message: DecodedMessage) => {
      if (message.kind !== GroupMessageKind.Application) return;
      const item: MessageItem = {
        id: message.id,
        content: message.content,
        senderInboxId: message.senderInboxId,
        sentAt: message.sentAt,
        kind: message.kind
      };
      messageHandler?.(item, message.conversationId);
    },
    onError: (err: unknown) => {
      console.error('XMTP stream error:', err);
    }
  });
}

export function useXmtp() {
  const { web3, auth } = useWeb3();

  function unreadKey(peer: string) {
    return `${web3.value.account.toLowerCase()}:${peer.toLowerCase()}`;
  }

  // Stream handler: updates module-level state directly
  messageHandler = (item: MessageItem, conversationId: string) => {
    const convo = conversations.value.find(c => c.id === conversationId);

    if (!convo) {
      loadConversations();
      return;
    }

    const isOwn = item.senderInboxId === xmtpClient.value?.inboxId;
    const text = textOf(item.content);
    const time = Math.floor(item.sentAt.getTime() / 1000);

    // Update conversations list
    conversations.value = conversations.value
      .map(c =>
        c.id === conversationId
          ? {
              ...c,
              lastMessageText: text,
              lastMessageTime: time,
              lastMessageIsOwn: isOwn
            }
          : c
      )
      .sort((a, b) => b.lastMessageTime - a.lastMessageTime);

    // For incoming peer messages: increment unread + append to messages cache
    if (!isOwn) {
      if (web3.value.account) {
        const key = unreadKey(convo.peerAddress);
        unreadCounts.value[key] = (unreadCounts.value[key] || 0) + 1;
      }

      const cacheKey = convo.peerAddress.toLowerCase();
      const cached = messageCache.value[cacheKey];
      if (cached && !cached.messages.some(m => m.id === item.id)) {
        messageCache.value = {
          ...messageCache.value,
          [cacheKey]: { ...cached, messages: [...cached.messages, item] }
        };
      }
    }
  };

  async function loadConversations() {
    if (!xmtpClient.value) return;

    const isInitial = conversations.value.length === 0;
    if (isInitial) conversationsLoading.value = true;

    try {
      const { ConsentState, GroupMessageKind } = await loadSdk();

      await xmtpClient.value.conversations.syncAll();
      const dms = await xmtpClient.value.conversations.listDms({
        consentStates: [ConsentState.Allowed, ConsentState.Unknown]
      });

      const previews: ConversationPreview[] = await Promise.all(
        dms.map(async dm => {
          const rawDm = markRaw(dm);
          let peerAddress = '';
          let lastMessageText = '';
          let lastMessageTime = 0;
          let lastMessageIsOwn = false;

          try {
            const members = await rawDm.members();
            const peer = members.find(
              m => m.inboxId !== xmtpClient.value?.inboxId
            );
            if (peer && peer.accountIdentifiers.length > 0) {
              peerAddress = peer.accountIdentifiers[0].identifier;
            } else {
              peerAddress = await rawDm.peerInboxId();
            }
          } catch {
            peerAddress = 'Unknown';
          }

          try {
            const lastMsg = await rawDm.lastMessage();
            if (lastMsg) {
              lastMessageText =
                lastMsg.kind === GroupMessageKind.Application
                  ? textOf(lastMsg.content)
                  : '';
              lastMessageTime = Math.floor(lastMsg.sentAt.getTime() / 1000);
              lastMessageIsOwn =
                lastMsg.senderInboxId === xmtpClient.value?.inboxId;
            }
          } catch {
            // no messages yet
          }

          return {
            id: rawDm.id,
            peerAddress,
            peerName: '',
            lastMessageText,
            lastMessageTime,
            lastMessageIsOwn
          };
        })
      );

      // Resolve ENS / Stamp names
      const addresses = previews
        .map(p => p.peerAddress)
        .filter(a => a && a !== 'Unknown');
      if (addresses.length) {
        const names = await getNames(addresses);
        for (const preview of previews) {
          preview.peerName = names[preview.peerAddress] || '';
        }
      }

      // Sort by latest message first
      previews.sort((a, b) => b.lastMessageTime - a.lastMessageTime);

      // Seed unread counts: if a conversation has never been seen, mark as 1
      if (web3.value.account) {
        for (const p of previews) {
          if (!p.lastMessageIsOwn && p.lastMessageTime) {
            const key = unreadKey(p.peerAddress);
            if (!(key in unreadCounts.value)) {
              unreadCounts.value[key] = 1;
            }
          }
        }
      }

      conversations.value = previews;
    } finally {
      conversationsLoading.value = false;
    }
  }

  async function loadMessages(peerAddress: string) {
    if (!xmtpClient.value) return;

    const key = peerAddress.toLowerCase();
    const isInitial = !messageCache.value[key];
    if (isInitial) messagesLoading.value = true;
    messagesError.value = null;

    try {
      const { GroupMessageKind } = await loadSdk();

      await xmtpClient.value.conversations.syncAll();
      const id = await getEthId(peerAddress);
      const rawConvo =
        await xmtpClient.value.conversations.fetchDmByIdentifier(id);
      if (!rawConvo) return;

      await rawConvo.sync();
      const allMsgs = await rawConvo.messages();
      const messages: MessageItem[] = allMsgs
        .filter((m: DecodedMessage) => m.kind === GroupMessageKind.Application)
        .map((m: DecodedMessage) => ({
          id: m.id,
          content: m.content,
          senderInboxId: m.senderInboxId,
          sentAt: m.sentAt,
          kind: m.kind
        }));

      // Resolve peer name
      let peerName = '';
      try {
        const names = await getNames([peerAddress]);
        peerName = names[peerAddress] || '';
      } catch {
        // fallback: no name
      }

      messageCache.value = {
        ...messageCache.value,
        [key]: { messages, peerName }
      };
    } catch (e: any) {
      messagesError.value = e.message || 'Failed to load messages';
    } finally {
      if (isInitial) messagesLoading.value = false;
    }
  }

  function getMessages(peerAddress: string): MessageItem[] {
    return messageCache.value[peerAddress.toLowerCase()]?.messages || [];
  }

  function getPeerName(peerAddress: string): string {
    const key = peerAddress.toLowerCase();
    const convo = conversations.value.find(
      c => c.peerAddress.toLowerCase() === key
    );
    if (convo?.peerName) return convo.peerName;
    return messageCache.value[key]?.peerName || '';
  }

  async function init() {
    if (xmtpClient.value || isInitializing.value) return;
    if (!auth.value) {
      error.value = 'Wallet not connected';
      return;
    }

    isInitializing.value = true;
    error.value = null;

    try {
      const { Client, IdentifierKind } = await loadSdk();

      const account = web3.value.account;
      const ethersProvider = auth.value.provider;
      const ethersSigner = ethersProvider.getSigner();

      const signer: Signer = {
        type: 'EOA',
        getIdentifier: () => ({
          identifier: account,
          identifierKind: IdentifierKind.Ethereum
        }),
        signMessage: async (message: string) => {
          const signature = await ethersSigner.signMessage(message);
          return hexToBytes(signature);
        }
      };

      const client = await Client.create(signer, {
        env: 'production',
        appVersion: 'snapshot/1.0'
      });

      xmtpClient.value = markRaw(client);
      xmtpActivated.value[account.toLowerCase()] = true;
      startMessageStream();
      loadConversations();
    } catch (e: any) {
      console.error('Failed to initialize XMTP client:', e);
      error.value = e.message || 'Failed to initialize XMTP';
    } finally {
      isInitializing.value = false;
    }
  }

  function disconnect() {
    if (activeStream) {
      activeStream.end();
      activeStream = null;
    }
    if (xmtpClient.value) {
      xmtpClient.value.close();
      xmtpClient.value = null;
    }
    conversations.value = [];
    messageCache.value = {};
  }

  async function sendMessageToPeer(
    peerAddress: string,
    text: string
  ): Promise<void> {
    const convo = await getOrCreateDm(peerAddress);
    if (!convo) return;
    await convo.sendText(text);

    // Optimistically update conversations list
    const now = Math.floor(Date.now() / 1000);
    conversations.value = conversations.value
      .map(c =>
        c.peerAddress.toLowerCase() === peerAddress.toLowerCase()
          ? {
              ...c,
              lastMessageText: text,
              lastMessageTime: now,
              lastMessageIsOwn: true
            }
          : c
      )
      .sort((a, b) => b.lastMessageTime - a.lastMessageTime);

    // Refresh messages from server
    await loadMessages(peerAddress);
  }

  // --- Unread tracking ---

  function markConversationRead(peerAddress: string) {
    if (!web3.value.account) return;
    unreadCounts.value[unreadKey(peerAddress)] = 0;
  }

  function getUnreadCount(peerAddress: string): number {
    if (!web3.value.account) return 0;
    return unreadCounts.value[unreadKey(peerAddress)] || 0;
  }

  const unreadCount = computed(() => {
    const account = web3.value.account;
    if (!account) return 0;
    const prefix = `${account.toLowerCase()}:`;
    return Object.entries(unreadCounts.value)
      .filter(([key, count]) => key.startsWith(prefix) && count > 0)
      .reduce((sum, [, count]) => sum + count, 0);
  });

  const route = useRoute();

  // Auto-init (only for returning users on "my" pages) and auto-disconnect
  watch(
    [() => web3.value.account, () => route.matched[0]?.name],
    ([account, mainRoute], [oldAccount]) => {
      if (oldAccount && account !== oldAccount) {
        disconnect();
      }
      if (
        account &&
        mainRoute === 'my' &&
        !xmtpClient.value &&
        !isInitializing.value &&
        xmtpActivated.value[account.toLowerCase()]
      ) {
        init();
      }
    },
    { immediate: true }
  );

  const isActivated = computed(() => {
    const account = web3.value.account;
    return account ? !!xmtpActivated.value[account.toLowerCase()] : false;
  });

  return {
    inboxId: computed(() => xmtpClient.value?.inboxId || ''),
    isInitializing: computed(() => isInitializing.value),
    isReady: computed(() => !!xmtpClient.value),
    isActivated,
    error: computed(() => error.value),
    conversations: computed(() => conversations.value),
    conversationsLoading: computed(() => conversationsLoading.value),
    messagesLoading: computed(() => messagesLoading.value),
    messagesError: computed(() => messagesError.value),
    getMessages,
    getPeerName,
    unreadCount,
    getUnreadCount,
    init,
    loadMessages,
    markConversationRead,
    sendMessageToPeer
  };
}
