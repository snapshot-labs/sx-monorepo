import { Meta, StoryObj } from '@storybook/vue3-vite';
import { fn } from 'storybook/test';
import Alert from './Alert.vue';

const meta = {
  title: 'Ui/Alert',
  component: Alert,
  tags: ['autodocs'],
  args: {
    type: 'error',
    dismissible: false,
    onClose: fn()
  },
  argTypes: {
    type: {
      control: { type: 'select' },
      options: ['error', 'warning', 'success']
    },
    dismissible: {
      control: { type: 'boolean' }
    }
  }
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Error: Story = {
  args: {
    type: 'error',
    dismissible: false,
    default: 'Something went wrong. Please try again.'
  }
};

export const Warning: Story = {
  args: {
    type: 'warning',
    dismissible: false,
    default: 'This action cannot be undone.'
  }
};

export const Success: Story = {
  args: {
    type: 'success',
    dismissible: false,
    default: 'Your changes have been saved successfully.'
  }
};

export const ErrorDismissible: Story = {
  args: {
    type: 'error',
    dismissible: true,
    default: 'This is a dismissible error alert.'
  }
};

export const WarningDismissible: Story = {
  args: {
    type: 'warning',
    dismissible: true,
    default: 'This is a dismissible warning alert.'
  }
};

export const SuccessDismissible: Story = {
  args: {
    type: 'success',
    dismissible: true,
    default: 'This is a dismissible success alert.'
  }
};

export const LongContent: Story = {
  args: {
    type: 'error',
    dismissible: true,
    default:
      'Network Error: Unable to connect to the server. This could be due to a temporary network issue, server maintenance, or a problem with your internet connection. Please check your connection and try again in a few moments.'
  }
};
