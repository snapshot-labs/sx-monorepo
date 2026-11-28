import dayjs from 'dayjs';
import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';
import Calendar from './Calendar.vue';

const meta = {
  title: 'Ui/Calendar',
  component: Calendar,
  tags: ['autodocs']
} satisfies Meta<typeof Calendar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {}
};

export const WithSelectedDate: Story = {
  args: {
    selected: dayjs().unix()
  }
};

export const WithMinimumDate: Story = {
  args: {
    min: dayjs().subtract(7, 'days').unix()
  }
};

export const WithSelectedAndMinimum: Story = {
  args: {
    selected: dayjs().add(3, 'days').unix(),
    min: dayjs().subtract(5, 'days').unix()
  }
};

// Shows the picked timestamp, with a minimum on the 10th
export const Interactive: Story = {
  args: {},
  render: () => ({
    components: { Calendar },
    setup: () => ({
      picked: ref<number | null>(null),
      min: Math.floor(new Date(2026, 10, 10).getTime() / 1000)
    }),
    template: `
      <div>
        <Calendar :min="min" @pick="value => (picked = value)" />
        <p id="picked" class="mt-3 text-center">Picked {{ picked }}</p>
      </div>
    `
  })
};
