import { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';
import SelectDropdown from './SelectDropdown.vue';

const meta: Meta = {
  title: 'Ui/SelectDropdown',
  // @ts-expect-error generic Vue components are incompatible with Storybook's Meta type
  component: SelectDropdown,
  tags: ['autodocs']
};

export default meta;
type Story = StoryObj<typeof meta>;

const items = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'closed', label: 'Closed' }
] as const;

export const Default: Story = {
  render: () => ({
    components: { SelectDropdown },
    setup() {
      const model = ref('all');
      return { model, items };
    },
    template: `
      <SelectDropdown v-model="model" title="Status" :items="items" />
    `
  })
};

export const StartPlacement: Story = {
  render: () => ({
    components: { SelectDropdown },
    setup() {
      const model = ref('all');
      return { model, items };
    },
    template: `
      <SelectDropdown v-model="model" title="Status" :items="items" placement="start" />
    `
  })
};
