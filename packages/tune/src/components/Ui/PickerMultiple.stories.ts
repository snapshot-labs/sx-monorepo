import { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';
import PickerMultiple from './PickerMultiple.vue';

const meta: Meta = {
  title: 'Ui/PickerMultiple',
  // @ts-expect-error generic Vue components are incompatible with Storybook's Meta type
  component: PickerMultiple,
  tags: ['autodocs']
};

export default meta;
type Story = StoryObj<typeof meta>;

const items = [
  { id: 'label1', name: 'Bug' },
  { id: 'label2', name: 'Feature' },
  { id: 'label3', name: 'Enhancement' },
  { id: 'label4', name: 'Documentation' }
];

export const Default: Story = {
  // @ts-expect-error generic Vue components are incompatible with Storybook's component types
  render: () => ({
    components: { PickerMultiple },
    setup() {
      const model = ref([]);
      return { model, items };
    },
    template: `
      <div class="relative" style="min-height: 400px;">
        <PickerMultiple v-model="model" :items="items">
          <template #button>
            <button class="border px-3 py-2 rounded">Select labels</button>
          </template>
        </PickerMultiple>
      </div>
    `
  })
};
