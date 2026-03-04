import { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';
import InputDuration from './InputDuration.vue';

const meta = {
  title: 'Ui/InputDuration',
  component: InputDuration,
  tags: ['autodocs']
} satisfies Meta<typeof InputDuration>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: args => ({
    components: { InputDuration },
    setup() {
      const model = ref(3600);
      return { args, model };
    },
    template: '<InputDuration v-bind="args" v-model="model" />'
  }),
  args: {
    definition: {
      title: 'Duration'
    }
  }
};

export const WithError: Story = {
  render: args => ({
    components: { InputDuration },
    setup() {
      const model = ref(3600);
      return { args, model };
    },
    template: '<InputDuration v-bind="args" v-model="model" />'
  }),
  args: {
    definition: {
      title: 'Duration'
    },
    error: 'Duration too short'
  }
};
