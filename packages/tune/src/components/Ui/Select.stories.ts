import { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';
import Select from './Select.vue';
import { FieldDefinitionWithOptions } from '../../types';

const meta: Meta = {
  title: 'Ui/Select',
  // @ts-expect-error generic Vue components are incompatible with Storybook's Meta type
  component: Select,
  tags: ['autodocs']
};

export default meta;
type Story = StoryObj<typeof meta>;

const definition: FieldDefinitionWithOptions<string> = {
  title: 'Choose',
  enum: ['option1', 'option2', 'option3'],
  options: [
    { id: 'option1', name: 'Option 1' },
    { id: 'option2', name: 'Option 2' },
    { id: 'option3', name: 'Option 3' }
  ]
};

export const Default: Story = {
  render: () => ({
    components: { Select },
    setup() {
      const model = ref('option1');
      return { model, definition };
    },
    template: `
      <Select v-model="model" :definition="definition" />
    `
  })
};

export const Disabled: Story = {
  render: () => ({
    components: { Select },
    setup() {
      const model = ref('option1');
      return { model, definition };
    },
    template: `
      <Select v-model="model" :definition="definition" disabled />
    `
  })
};
