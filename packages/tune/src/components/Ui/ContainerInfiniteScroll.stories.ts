import { Meta, StoryObj } from '@storybook/vue3-vite';
import { fn } from 'storybook/test';
import ContainerInfiniteScroll from './ContainerInfiniteScroll.vue';

const meta = {
  title: 'Ui/ContainerInfiniteScroll',
  component: ContainerInfiniteScroll,
  tags: ['autodocs'],
  args: {
    onEndReached: fn()
  }
} satisfies Meta<typeof ContainerInfiniteScroll>;

export default meta;
type Story = StoryObj<typeof meta>;

const items = Array.from({ length: 10 }, (_, i) => `Item ${i + 1}`);

export const Default: Story = {
  render: args => ({
    components: { ContainerInfiniteScroll },
    setup: () => ({ args, items }),
    template: `
      <div style="height: 300px; overflow: auto">
        <ContainerInfiniteScroll v-bind="args">
          <div v-for="item in items" :key="item" class="border-b p-3">{{ item }}</div>
        </ContainerInfiniteScroll>
      </div>
    `
  })
};

export const LoadingMore: Story = {
  render: args => ({
    components: { ContainerInfiniteScroll },
    setup: () => ({ args, items }),
    template: `
      <div style="height: 300px; overflow: auto">
        <ContainerInfiniteScroll v-bind="args" loading-more>
          <div v-for="item in items" :key="item" class="border-b p-3">{{ item }}</div>
        </ContainerInfiniteScroll>
      </div>
    `
  })
};

export const Disabled: Story = {
  render: args => ({
    components: { ContainerInfiniteScroll },
    setup: () => ({ args, items }),
    template: `
      <div style="height: 300px; overflow: auto">
        <ContainerInfiniteScroll v-bind="args" :enabled="false">
          <div v-for="item in items" :key="item" class="border-b p-3">{{ item }}</div>
        </ContainerInfiniteScroll>
      </div>
    `
  })
};
