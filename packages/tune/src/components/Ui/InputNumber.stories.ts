import { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';
import InputNumber from './InputNumber.vue';

const meta = {
  title: 'Ui/InputNumber',
  component: InputNumber,
  tags: ['autodocs']
} satisfies Meta<typeof InputNumber>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: args => ({
    components: { InputNumber },
    setup() {
      const model = ref(0);
      return { args, model };
    },
    template: '<InputNumber v-bind="args" v-model="model" />'
  }),
  args: {
    definition: {
      title: 'Amount'
    }
  }
};

export const WithMinMax: Story = {
  render: args => ({
    components: { InputNumber },
    setup() {
      const model = ref(0);
      return { args, model };
    },
    template: '<InputNumber v-bind="args" v-model="model" />'
  }),
  args: {
    definition: {
      title: 'Amount',
      minimum: 0,
      maximum: 100
    }
  }
};

export const Disabled: Story = {
  render: args => ({
    components: { InputNumber },
    setup() {
      const model = ref(0);
      return { args, model };
    },
    template: '<InputNumber v-bind="args" v-model="model" />'
  }),
  args: {
    definition: {
      title: 'Amount'
    },
    disabled: true
  }
};
