import { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';
import Combobox from './Combobox.vue';
import { FieldDefinitionWithOptions } from '../../types';

const meta: Meta = {
  title: 'Ui/Combobox',
  // @ts-expect-error generic Vue components are incompatible with Storybook's Meta type
  component: Combobox,
  tags: ['autodocs']
};

export default meta;
type Story = StoryObj<typeof meta>;

const definition: FieldDefinitionWithOptions<string | null> = {
  title: 'Country',
  options: [
    { id: 'us', name: 'United States' },
    { id: 'uk', name: 'United Kingdom' },
    { id: 'fr', name: 'France' },
    { id: 'de', name: 'Germany' }
  ],
  enum: ['us', 'uk', 'fr', 'de', null],
  examples: ['Search countries...']
};

export const Default: Story = {
  render: () => ({
    components: { Combobox },
    setup() {
      const model = ref(null);
      return { model, definition };
    },
    template: `
      <Combobox v-model="model" :definition="definition" />
    `
  })
};

export const Inline: Story = {
  render: () => ({
    components: { Combobox },
    setup() {
      const model = ref(null);
      return { model, definition };
    },
    template: `
      <Combobox v-model="model" :definition="definition" inline :gap="12" />
    `
  })
};
