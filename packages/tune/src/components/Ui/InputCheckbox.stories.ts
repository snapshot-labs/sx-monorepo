import { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';
import InputCheckbox from './InputCheckbox.vue';

const meta: Meta = {
  title: 'Ui/InputCheckbox',
  component: InputCheckbox,
  tags: ['autodocs']
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: args => ({
    components: { InputCheckbox },
    setup() {
      const model = ref(false);
      return { args, model };
    },
    template: '<InputCheckbox v-bind="args" v-model="model" />'
  }),
  args: {
    definition: {
      title: 'Accept terms'
    }
  }
};

export const WithDefault: Story = {
  render: args => ({
    components: { InputCheckbox },
    setup() {
      const model = ref(false);
      return { args, model };
    },
    template: '<InputCheckbox v-bind="args" v-model="model" />'
  }),
  args: {
    definition: {
      title: 'Accept terms',
      default: true
    }
  }
};
