import { Meta, StoryObj } from '@storybook/vue3-vite';
import Loading from './Loading.vue';

const meta = {
  title: 'Ui/Loading',
  component: Loading,
  tags: ['autodocs']
} satisfies Meta<typeof Loading>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    inverse: false,
    size: 20
  }
};

export const Large: Story = {
  args: {
    inverse: false,
    size: 40
  }
};

export const Small: Story = {
  args: {
    inverse: false,
    size: 16
  }
};

export const Inverse: Story = {
  args: {
    inverse: true,
    size: 20
  },
  globals: {
    backgrounds: {
      value: 'dark'
    }
  }
};

export const InverseLarge: Story = {
  args: {
    inverse: true,
    size: 40
  },
  globals: {
    backgrounds: {
      value: 'dark'
    }
  }
};
