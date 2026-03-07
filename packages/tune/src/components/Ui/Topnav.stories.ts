import { Meta, StoryObj } from '@storybook/vue3-vite';
import Topnav from './Topnav.vue';

const meta = {
  title: 'Ui/Topnav',
  component: Topnav,
  tags: ['autodocs']
} satisfies Meta<typeof Topnav>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => ({
    components: { Topnav },
    template: `
      <Topnav>
        <div class="flex items-center gap-3 pl-4">
          <span class="font-bold text-lg text-skin-link">Logo</span>
        </div>
        <div class="flex items-center gap-3">
          <button class="border px-3 py-1 rounded">Connect</button>
        </div>
      </Topnav>
    `
  })
};
