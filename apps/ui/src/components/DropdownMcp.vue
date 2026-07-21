<script setup lang="ts">
import { FunctionalComponent } from 'vue';
import ICChatgpt from '~icons/c/chatgpt';
import ICClaude from '~icons/c/claude';
import ICCursor from '~icons/c/cursor';

const MCP_URL = 'https://mcp.snapshot.box';

const CLIENTS: {
  name: string;
  icon: FunctionalComponent;
  link: string;
  copyUrl?: boolean;
}[] = [
  {
    name: 'Claude',
    icon: ICClaude,
    link: `https://claude.ai/customize/connectors?modal=add-custom-connector&connectorName=Snapshot&connectorUrl=${encodeURIComponent(MCP_URL)}`
  },
  {
    // ChatGPT has no deep link to prefill the server URL,
    // so we copy it to the clipboard for pasting
    name: 'ChatGPT',
    icon: ICChatgpt,
    link: 'https://chatgpt.com/#settings/ConnectorSettings?create-connector=true',
    copyUrl: true
  },
  {
    name: 'Cursor',
    icon: ICCursor,
    link: 'cursor://anysphere.cursor-deeplink/mcp/install?name=snapshot&config=eyJ1cmwiOiJodHRwczovL21jcC5zbmFwc2hvdC5ib3gifQ=='
  }
];

const uiStore = useUiStore();
const { copy } = useClipboard();

const iconIndex = ref(0);
useIntervalFn(() => {
  iconIndex.value = (iconIndex.value + 1) % CLIENTS.length;
}, 1000);

function handleCopyUrlClick() {
  copy(MCP_URL);
  uiStore.addNotification('success', 'MCP server URL copied.');
}

function handleCopyInstructionClick() {
  copy(`Add the Snapshot MCP server to this environment, using this client's standard method for adding a remote MCP server.

- Name: Snapshot
- URL: ${MCP_URL}
- Transport: HTTP (OAuth handled by the server)

Setup guide: https://docs.snapshot.box/tools/snapshot-mcp`);
  uiStore.addNotification('success', 'Instruction copied.');
}
</script>

<template>
  <UiDropdown>
    <template #button>
      <UiButton>
        <component :is="CLIENTS[iconIndex].icon" class="size-[18px]" />
        Add Snapshot MCP
      </UiButton>
    </template>
    <template #items>
      <UiDropdownItem
        v-for="client in CLIENTS"
        :key="client.name"
        :title="`Add to ${client.name}`"
        :to="client.link"
        is-external
        @click="client.copyUrl && handleCopyUrlClick()"
      >
        <component :is="client.icon" />
        Add to {{ client.name }}
      </UiDropdownItem>
      <UiDropdownItem @click="handleCopyUrlClick">
        <IH-link />
        Copy server URL
      </UiDropdownItem>
      <UiDropdownItem @click="handleCopyInstructionClick">
        <IH-clipboard-copy />
        Copy instruction
      </UiDropdownItem>
    </template>
  </UiDropdown>
</template>
