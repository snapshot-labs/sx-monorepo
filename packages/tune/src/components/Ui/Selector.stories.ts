import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';
import Selector from './Selector.vue';
import SelectorGroup from './SelectorGroup.vue';

const meta = {
  title: 'Ui/Selector',
  component: Selector,
  tags: ['autodocs'],
  argTypes: {
    isActive: { control: 'boolean' }
  }
} satisfies Meta<typeof Selector>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    value: 'option',
    isActive: false
  },
  render: args => ({
    components: { Selector, SelectorGroup },
    setup() {
      return { args };
    },
    template:
      '<SelectorGroup aria-label="Options"><Selector v-bind="args"><span style="padding-right: 24px;">Selector option</span></Selector></SelectorGroup>'
  })
};

export const Active: Story = {
  args: {
    value: 'option',
    isActive: true
  },
  render: args => ({
    components: { Selector, SelectorGroup },
    setup() {
      return { args };
    },
    template:
      '<SelectorGroup aria-label="Options" model-value="option"><Selector v-bind="args"><span style="padding-right: 24px;">Active selector option</span></Selector></SelectorGroup>'
  })
};

// Picks like the voting system modal: arrows move, a press or Enter picks
export const Interactive: Story = {
  args: { value: '' },
  render: () => ({
    components: { Selector, SelectorGroup },
    setup: () => ({
      types: ['basic', 'single-choice', 'approval'],
      current: ref('basic'),
      picks: ref<string[]>([])
    }),
    template: `
      <div class="max-w-[400px]">
        <SelectorGroup aria-label="Voting system" :model-value="current" class="flex flex-col gap-2.5" @select="value => picks.push(value)">
          <Selector v-for="type in types" :key="type" :value="type" :is-active="current === type" :disabled="type === 'approval'">
            <span class="pr-6">{{ type }}</span>
          </Selector>
        </SelectorGroup>
        <p id="picks" class="mt-3">Picks {{ picks.join(',') }}</p>
      </div>
    `
  })
};
