import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';
import type { Component } from 'vue';
import ReorderList from './ReorderList.vue';

const meta = { title: 'Ui/ReorderList' } satisfies Meta;

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => ({
    components: { ReorderList: ReorderList as Component },
    setup: () => ({ items: ref(['Ethereum', 'Base', 'Arbitrum']) }),
    template: `
      <div class="max-w-[300px]">
        <ReorderList v-model="items" :item-key="item => item" handle=".handle" animated class="space-y-2">
          <template #item="{ element, index }">
            <div class="flex items-center gap-2 border rounded-lg px-3 py-2">
              <button type="button" class="handle cursor-grab touch-none" :aria-label="'Move ' + element">⋮⋮</button>
              <span>{{ index }}. {{ element }}</span>
            </div>
          </template>
        </ReorderList>
        <p id="value" class="mt-3">Value {{ items.join(',') }}</p>
      </div>
    `
  })
};

// Keyed by the objects themselves, like transactions in the editor
export const Objects: Story = {
  render: () => ({
    components: { ReorderList: ReorderList as Component },
    setup: () => ({
      items: ref([{ to: 'Alice' }, { to: 'Bob' }, { to: 'Carol' }])
    }),
    template: `
      <div class="max-w-[300px]">
        <ReorderList v-model="items" :item-key="item => item" handle=".handle" class="space-y-2">
          <template #item="{ element }">
            <div class="flex items-center gap-2 border rounded-lg px-3 py-2">
              <button type="button" class="handle cursor-grab touch-none" :aria-label="'Move ' + element.to">⋮⋮</button>
              <span>{{ element.to }}</span>
            </div>
          </template>
        </ReorderList>
        <p id="value" class="mt-3">Value {{ items.map(item => item.to).join(',') }}</p>
      </div>
    `
  })
};
