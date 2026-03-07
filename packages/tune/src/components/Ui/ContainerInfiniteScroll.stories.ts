import { Meta, StoryObj } from '@storybook/vue3-vite';
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
  render: args => ({
    components: { ContainerInfiniteScroll },
    setup: () => ({ args }),
    template: `
      <ContainerInfiniteScroll v-bind="args">
        <div v-for="i in 10" :key="i" class="border p-3 mb-2">Item {{ i }}</div>
      </ContainerInfiniteScroll>
    `
  })
};

export const LoadingMore: Story = {
  render: args => ({
    components: { ContainerInfiniteScroll },
    setup: () => ({ args }),
    template: `
      <ContainerInfiniteScroll v-bind="args">
        <div v-for="i in 5" :key="i" class="border p-3 mb-2">Item {{ i }}</div>
      </ContainerInfiniteScroll>
    `
  }),
  args: {
    loadingMore: true
  }
};
