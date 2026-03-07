import { Meta, StoryObj } from '@storybook/vue3-vite';
import dayjs from 'dayjs';
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

export const PastDateSelected: Story = {
  args: {
    selected: dayjs().subtract(10, 'days').unix()
  }
};

export const FutureDateSelected: Story = {
  args: {
    selected: dayjs().add(15, 'days').unix()
  }
};
