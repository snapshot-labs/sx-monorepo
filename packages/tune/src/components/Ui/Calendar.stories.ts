import { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';
import Calendar from './Calendar.vue';

const meta = {
  title: 'Ui/Calendar',
  component: Calendar,
  tags: ['autodocs']
} satisfies Meta<typeof Calendar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithSelected: Story = {
  args: {
    selected: Math.floor(Date.now() / 1000)
  }
};

export const WithMinDate: Story = {
  args: {
    min: Math.floor(Date.now() / 1000) - 86400 * 3,
    selected: Math.floor(Date.now() / 1000)
  }
};

export const Interactive: Story = {
  render: () => ({
    components: { Calendar },
    setup() {
      const selected = ref<number | undefined>(undefined);

      function onPick(timestamp: number) {
        selected.value = timestamp;
      }

      return { selected, onPick };
    },
    template: `<Calendar :selected="selected" @pick="onPick" />`
  })
};
