import { Meta, StoryObj } from '@storybook/vue3-vite';
import Message from './Message.vue';

const meta = {
  title: 'Ui/Message',
  component: Message,
  tags: ['autodocs'],
  args: {
    type: 'info',
    learnMoreLink: undefined
  },
  argTypes: {
    type: {
      control: { type: 'select' },
      options: ['info', 'danger']
    }
  }
} satisfies Meta<typeof Message>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Info: Story = {
  args: {
    type: 'info',
    default: 'This is an informational message to help guide you.'
  }
};

export const Danger: Story = {
  args: {
    type: 'danger',
    default: 'This is a danger message indicating something important.'
  }
};

export const InfoWithLearnMore: Story = {
  args: {
    type: 'info',
    learnMoreLink: 'https://docs.snapshot.org',
    default: 'This is an informational message with additional resources.'
  }
};

export const DangerWithLearnMore: Story = {
  args: {
    type: 'danger',
    learnMoreLink: 'https://help.snapshot.org',
    default: 'This is a danger message with helpful documentation.'
  }
};

export const LongContent: Story = {
  args: {
    type: 'info',
    learnMoreLink: 'https://docs.snapshot.org/guides',
    default:
      'This is a longer informational message that demonstrates how the component handles extended content. It includes multiple sentences to show text wrapping and layout behavior within the message container.'
  }
};
