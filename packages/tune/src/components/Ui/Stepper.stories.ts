import type { Meta, StoryObj } from '@storybook/vue3-vite';
import Stepper from './Stepper.vue';

const meta = { title: 'Ui/Stepper', component: Stepper } satisfies Meta<
  typeof Stepper
>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    steps: {
      profile: { title: 'Profile', isValid: () => true },
      voting: { title: 'Voting', isValid: () => false },
      members: { title: 'Members', isValid: () => false }
    }
  },
  render: args => ({
    components: { Stepper },
    setup: () => ({ args }),
    template: `
      <Stepper v-bind="args">
        <template #content="{ currentStep }"><div class="border p-3">Step {{ currentStep }}</div></template>
      </Stepper>`
  })
};
