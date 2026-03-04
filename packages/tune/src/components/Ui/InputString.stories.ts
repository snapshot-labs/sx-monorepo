import { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';
import InputString from './InputString.vue';

const meta = {
  title: 'Ui/InputString',
  component: InputString,
  tags: ['autodocs']
} satisfies Meta<typeof InputString>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: args => ({
    components: { InputString },
    setup() {
      const model = ref('');
      return { args, model };
    },
    template: '<InputString v-bind="args" v-model="model" />'
  }),
  args: {
    definition: {
      title: 'Name',
      examples: ['Enter your name']
    }
  }
};

export const WithMaxLength: Story = {
  render: args => ({
    components: { InputString },
    setup() {
      const model = ref('');
      return { args, model };
    },
    template: '<InputString v-bind="args" v-model="model" />'
  }),
  args: {
    definition: {
      title: 'Name',
      examples: ['Enter your name'],
      maxLength: 50
    }
  }
};

export const WithError: Story = {
  render: args => ({
    components: { InputString },
    setup() {
      const model = ref('');
      return { args, model };
    },
    template: '<InputString v-bind="args" v-model="model" />'
  }),
  args: {
    definition: {
      title: 'Name',
      examples: ['Enter your name']
    },
    error: 'This field is required'
  }
};

export const Required: Story = {
  render: args => ({
    components: { InputString },
    setup() {
      const model = ref('');
      return { args, model };
    },
    template: '<InputString v-bind="args" v-model="model" />'
  }),
  args: {
    definition: {
      title: 'Name',
      examples: ['Enter your name']
    },
    required: true
  }
};
