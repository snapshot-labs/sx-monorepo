import { Meta, StoryObj } from '@storybook/vue3-vite';
import ScrollerHorizontal from './ScrollerHorizontal.vue';

const meta = {
  title: 'Ui/ScrollerHorizontal',
  component: ScrollerHorizontal,
  tags: ['autodocs'],
  argTypes: {
    withButtons: { control: 'boolean' },
    gradient: { control: 'select', options: [false, 'sm', 'md', 'xxl'] }
  }
} satisfies Meta<typeof ScrollerHorizontal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: args => ({
    components: { ScrollerHorizontal },
    setup: () => ({ args }),
    template: `
      <ScrollerHorizontal v-bind="args">
        <div class="flex gap-3">
          <div v-for="i in 20" :key="i" class="border rounded px-4 py-2 whitespace-nowrap shrink-0">Item {{ i }}</div>
        </div>
      </ScrollerHorizontal>
    `
  })
};

export const WithGradient: Story = {
  render: args => ({
    components: { ScrollerHorizontal },
    setup: () => ({ args }),
    template: `
      <ScrollerHorizontal v-bind="args">
        <div class="flex gap-3">
          <div v-for="i in 20" :key="i" class="border rounded px-4 py-2 whitespace-nowrap shrink-0">Item {{ i }}</div>
        </div>
      </ScrollerHorizontal>
    `
  }),
  args: {
    gradient: 'md'
  }
};

export const WithButtons: Story = {
  render: args => ({
    components: { ScrollerHorizontal },
    setup: () => ({ args }),
    template: `
      <ScrollerHorizontal v-bind="args">
        <div class="flex gap-3">
          <div v-for="i in 20" :key="i" class="border rounded px-4 py-2 whitespace-nowrap shrink-0">Item {{ i }}</div>
        </div>
      </ScrollerHorizontal>
    `
  }),
  args: {
    withButtons: true,
    gradient: 'xxl'
  }
};
