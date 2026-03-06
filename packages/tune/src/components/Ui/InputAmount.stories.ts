import { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';
import InputAmount from './InputAmount.vue';
import { FieldDefinition } from '../../types';

const meta: Meta = {
  title: 'Ui/InputAmount',
  component: InputAmount,
  tags: ['autodocs']
};

export default meta;
type Story = StoryObj<typeof meta>;

const definition: FieldDefinition<string> = {
  title: 'Amount',
  examples: ['0.00']
};

export const Default: Story = {
  render: () => ({
    components: { InputAmount },
    setup() {
      const model = ref('');
      return { model, definition };
    },
    template: `
      <InputAmount v-model="model" :definition="definition" />
    `
  })
};
