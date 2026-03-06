import { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';
import Textarea from './Textarea.vue';

const meta = {
  title: 'Ui/Textarea',
  component: Textarea,
  tags: ['autodocs']
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: args => ({
    components: { Textarea },
    setup() {
      const model = ref('');
      return { args, model };
    },
    template: '<Textarea v-bind="args" v-model="model" />'
  }),
  args: {
    definition: {
      title: 'Description',
      examples: ['Enter a description'],
      maxLength: 500
    }
  }
};

export const Required: Story = {
  render: args => ({
    components: { Textarea },
    setup() {
      const model = ref('');
      return { args, model };
    },
    template: '<Textarea v-bind="args" v-model="model" />'
  }),
  args: {
    definition: {
      title: 'Description',
      examples: ['Enter a description'],
      maxLength: 500
    },
    required: true
  }
};
