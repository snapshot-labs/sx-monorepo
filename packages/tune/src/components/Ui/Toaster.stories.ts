import { toast } from '@ui-sdk/vue/toast';
import type { Meta, StoryObj } from '@storybook/vue3-vite';
import Toaster from './Toaster.vue';

const meta = {
  title: 'Ui/Toaster',
  component: Toaster
} satisfies Meta<typeof Toaster>;

export default meta;
type Story = StoryObj<typeof meta>;

const MESSAGES = {
  success: 'Link copied.',
  warning: 'Some voting strategies are not supported.',
  error:
    'Your proposal could not be created because the voting strategy returned an error, please try again later.'
};

export const Default: Story = {
  render: () => ({
    components: { Toaster },
    setup: () => ({
      types: Object.keys(MESSAGES),
      show: (type: keyof typeof MESSAGES, duration = 60000) =>
        toast[type](MESSAGES[type], { duration })
    }),
    template: `
      <div class="flex gap-2">
        <button v-for="type in types" :key="type" :id="type" class="s-input !w-auto" @click="show(type)">{{ type }}</button>
        <button id="short" class="s-input !w-auto" @click="show('success', 500)">short</button>
        <Toaster />
      </div>
    `
  })
};

export const Stack: Story = {
  render: () => ({
    components: { Toaster },
    setup: () => {
      for (const [type, message] of Object.entries(MESSAGES)) {
        toast[type as keyof typeof MESSAGES](message, { duration: Infinity });
      }
    },
    template: '<Toaster />'
  })
};
