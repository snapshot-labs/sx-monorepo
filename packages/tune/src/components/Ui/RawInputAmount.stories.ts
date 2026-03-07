import { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';
import RawInputAmount from './RawInputAmount.vue';

const meta = {
  title: 'Ui/RawInputAmount',
  component: RawInputAmount,
  tags: ['autodocs'],
  argTypes: {
    decimals: { control: 'number' }
  }
} satisfies Meta<typeof RawInputAmount>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    modelValue: '0'
  },
  render: args => ({
    components: { RawInputAmount },
    setup: () => {
      const value = ref('0');
      return { args, value };
    },
    template: `
      <RawInputAmount v-model="value" v-bind="args" class="border rounded px-3 py-2 w-full" />
      <div class="mt-2 text-sm">Value: {{ value }}</div>
    `
  })
};

export const WithDecimals: Story = {
  args: {
    modelValue: '0',
    decimals: 2
  },
  render: args => ({
    components: { RawInputAmount },
    setup: () => {
      const value = ref('0');
      return { args, value };
    },
    template: `
      <RawInputAmount v-model="value" v-bind="args" class="border rounded px-3 py-2 w-full" />
      <div class="mt-2 text-sm">Value: {{ value }}</div>
    `
  })
};
