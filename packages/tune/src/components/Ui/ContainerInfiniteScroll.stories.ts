import type { Meta, StoryObj } from '@storybook/vue3-vite';
import ContainerInfiniteScroll from './ContainerInfiniteScroll.vue';

const meta = {
  title: 'Ui/ContainerInfiniteScroll',
  component: ContainerInfiniteScroll,
  tags: ['autodocs'],
  argTypes: {
    enabled: { control: 'boolean' },
    loadingMore: { control: 'boolean' }
  }
} satisfies Meta<typeof ContainerInfiniteScroll>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    enabled: true,
    loadingMore: false
  },
  render: args => ({
    components: { ContainerInfiniteScroll },
    setup() {
      return { args };
    },
    template: `<ContainerInfiniteScroll v-bind="args">
      <div v-for="i in 10" :key="i" style="padding: 8px; border-bottom: 1px solid #e5e7eb;">Item {{ i }}</div>
    </ContainerInfiniteScroll>`
  })
};

export const LoadingMore: Story = {
  args: {
    enabled: true,
    loadingMore: true
  },
  render: args => ({
    components: { ContainerInfiniteScroll },
    setup() {
      return { args };
    },
    template: `<ContainerInfiniteScroll v-bind="args">
      <div v-for="i in 5" :key="i" style="padding: 8px; border-bottom: 1px solid #e5e7eb;">Item {{ i }}</div>
    </ContainerInfiniteScroll>`
  })
};
