import { Meta, StoryObj } from '@storybook/vue3-vite';
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
    modelValue: ''
  },
  render: args => ({
    components: { RawInputAmount },
    setup() {
      return { args };
    },
    template:
      '<RawInputAmount v-bind="args" style="border: 1px solid #e5e7eb; padding: 8px; border-radius: 4px;" />'
  })
};

export const WithDecimals: Story = {
  args: {
    modelValue: '',
    decimals: 2
  },
  parameters: {
    docs: {
      description: {
        story: 'Limits decimal places to the specified number (e.g. 2 decimals).'
      }
    }
  },
  render: args => ({
    components: { RawInputAmount },
    setup() {
      return { args };
    },
    template:
      '<RawInputAmount v-bind="args" style="border: 1px solid #e5e7eb; padding: 8px; border-radius: 4px;" />'
  })
};
