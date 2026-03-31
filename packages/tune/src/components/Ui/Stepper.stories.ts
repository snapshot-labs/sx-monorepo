import type { Meta, StoryObj } from '@storybook/vue3-vite';
import Stepper from './Stepper.vue';

const meta = {
  title: 'Ui/Stepper',
  component: Stepper,
  tags: ['autodocs']
} satisfies Meta<typeof Stepper>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: args => ({
    components: { Stepper },
    setup: () => ({ args }),
    template: `
      <Stepper v-bind="args">
        <template #content="{ currentStep }">
          <div style="padding: 16px; border: 1px solid rgba(var(--border)); border-radius: 8px;">
            Current step: {{ currentStep }}
          </div>
        </template>
      </Stepper>
    `
  }),
  args: {
    steps: {
      profile: { title: 'Profile', isValid: () => true },
      settings: { title: 'Settings', isValid: () => false },
      review: { title: 'Review', isValid: () => false }
    }
  }
};

export const AllValid: Story = {
  render: args => ({
    components: { Stepper },
    setup: () => ({ args }),
    template: `
      <Stepper v-bind="args">
        <template #content="{ currentStep }">
          <div style="padding: 16px; border: 1px solid rgba(var(--border)); border-radius: 8px;">
            Current step: {{ currentStep }}
          </div>
        </template>
        <template #submit-text>Create space</template>
      </Stepper>
    `
  }),
  args: {
    steps: {
      profile: { title: 'Profile', isValid: () => true },
      settings: { title: 'Settings', isValid: () => true },
      review: { title: 'Review', isValid: () => true }
    }
  }
};
