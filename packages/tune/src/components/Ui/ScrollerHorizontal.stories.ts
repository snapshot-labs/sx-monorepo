import { Meta, StoryObj } from '@storybook/vue3-vite';
import ScrollerHorizontal from './ScrollerHorizontal.vue';

const meta = {
  title: 'Ui/ScrollerHorizontal',
  component: ScrollerHorizontal,
  tags: ['autodocs'],
  argTypes: {
    withButtons: { control: 'boolean' },
    gradient: {
      control: 'select',
      options: [false, 'sm', 'md', 'xxl']
    }
  }
} satisfies Meta<typeof ScrollerHorizontal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: args => ({
    components: { ScrollerHorizontal },
    setup() {
      return { args };
    },
    template: `<ScrollerHorizontal v-bind="args" style="width: 300px;">
      <div style="display: flex; gap: 8px; white-space: nowrap;">
        <span v-for="i in 20" :key="i" style="padding: 8px 16px; background: #f3f4f6; border-radius: 8px;">Item {{ i }}</span>
      </div>
    </ScrollerHorizontal>`
  })
};
