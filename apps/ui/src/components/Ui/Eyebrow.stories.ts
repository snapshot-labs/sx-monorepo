import { Meta, StoryObj } from '@storybook/vue3-vite';
import Eyebrow from './Eyebrow.vue';

const meta = {
  title: 'Ui/Eyebrow',
  component: Eyebrow,
  tags: ['autodocs']
} satisfies Meta<typeof Eyebrow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => ({
    components: { Eyebrow },
    template: '<Eyebrow>Eyebrow Text</Eyebrow>'
  })
};
