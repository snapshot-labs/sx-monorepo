import { Meta, StoryObj } from '@storybook/vue3-vite';
import ScrollerHorizontal from './ScrollerHorizontal.vue';

const items = Array.from({ length: 20 }, (_, i) => `Item ${i + 1}`);

const meta = {
  title: 'Ui/ScrollerHorizontal',
  component: ScrollerHorizontal,
  tags: ['autodocs'],
  decorators: [
    () => ({ template: '<div style="max-width: 400px"><story /></div>' })
  ]
} satisfies Meta<typeof ScrollerHorizontal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: args => ({
    components: { ScrollerHorizontal },
    setup: () => ({ args, items }),
    template: `
      <ScrollerHorizontal v-bind="args">
        <div class="flex gap-2 whitespace-nowrap p-2">
          <span v-for="item in items" :key="item" class="border rounded-full px-3 py-1">{{ item }}</span>
        </div>
      </ScrollerHorizontal>
    `
  })
};

export const WithGradient: Story = {
  render: args => ({
    components: { ScrollerHorizontal },
    setup: () => ({ args, items }),
    template: `
      <ScrollerHorizontal v-bind="args" gradient="md">
        <div class="flex gap-2 whitespace-nowrap p-2">
          <span v-for="item in items" :key="item" class="border rounded-full px-3 py-1">{{ item }}</span>
        </div>
      </ScrollerHorizontal>
    `
  })
};

export const WithButtons: Story = {
  render: args => ({
    components: { ScrollerHorizontal },
    setup: () => ({ args, items }),
    template: `
      <ScrollerHorizontal v-bind="args" gradient="xxl" with-buttons>
        <div class="flex gap-2 whitespace-nowrap p-2">
          <span v-for="item in items" :key="item" class="border rounded-full px-3 py-1">{{ item }}</span>
        </div>
      </ScrollerHorizontal>
    `
  })
};
