import { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';
import SelectMultiple from './SelectMultiple.vue';
import { FieldDefinitionWithMultipleOptions } from '../../types';

const meta: Meta = {
  title: 'Ui/SelectMultiple',
  // @ts-expect-error generic Vue components are incompatible with Storybook's Meta type
  component: SelectMultiple,
  tags: ['autodocs']
};

export default meta;
type Story = StoryObj<typeof meta>;

const definition: FieldDefinitionWithMultipleOptions<string> & {
  maxItems?: number;
} = {
  title: 'Tags',
  enum: ['red', 'blue', 'green'],
  options: [
    { id: 'red', name: 'Red' },
    { id: 'blue', name: 'Blue' },
    { id: 'green', name: 'Green' }
  ]
};

const definitionWithMaxItems: FieldDefinitionWithMultipleOptions<string> & {
  maxItems?: number;
} = {
  ...definition,
  maxItems: 2
};

export const Default: Story = {
  render: () => ({
    components: { SelectMultiple },
    setup() {
      const model = ref<string[]>([]);
      return { model, definition };
    },
    template: `
      <SelectMultiple v-model="model" :definition="definition" />
    `
  })
};

export const WithMaxItems: Story = {
  render: () => ({
    components: { SelectMultiple },
    setup() {
      const model = ref<string[]>([]);
      return { model, definitionWithMaxItems };
    },
    template: `
      <SelectMultiple v-model="model" :definition="definitionWithMaxItems" />
    `
  })
};
