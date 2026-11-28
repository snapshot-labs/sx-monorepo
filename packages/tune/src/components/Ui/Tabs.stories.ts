import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';
import Label from './Label.vue';
import Tab from './Tab.vue';
import Tabs from './Tabs.vue';

const meta = { title: 'Ui/Tabs', component: Tabs } satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

// Tabs that switch a view, valued by index like delegations
export const Default: Story = {
  render: () => ({
    components: { Tabs, Tab, Label },
    setup: () => ({ value: ref(0), names: ['Overview', 'Votes', 'Execution'] }),
    template: `
      <div>
        <Tabs v-model="value" aria-label="Proposal" class="flex px-4 space-x-3 border-b">
          <Tab v-for="(name, i) in names" :key="i" v-slot="{ selected }" :value="i">
            <Label :is-active="selected" :text="name" />
          </Tab>
        </Tabs>
        <p id="value" class="p-4">Value {{ value }} ({{ typeof value }})</p>
      </div>
    `
  })
};
