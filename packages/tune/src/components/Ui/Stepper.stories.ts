import { Meta, StoryObj } from '@storybook/vue3-vite';
import Stepper, { StepRecords } from './Stepper.vue';

const meta: Meta = {
  title: 'Ui/Stepper',
  component: Stepper,
  tags: ['autodocs']
};

export default meta;
type Story = StoryObj<typeof meta>;

const steps: StepRecords = {
  profile: { title: 'Profile', isValid: () => true },
  settings: { title: 'Settings', isValid: () => true },
  review: { title: 'Review', isValid: () => false }
};

export const Default: Story = {
  render: () => ({
    components: { Stepper },
    setup() {
      return { steps };
    },
    template: `
      <Stepper :steps="steps">
        <template #content="{ currentStep }">
          <div class="p-4">Current step: {{ currentStep }}</div>
        </template>
      </Stepper>
    `
  })
};

export const Submitting: Story = {
  render: () => ({
    components: { Stepper },
    setup() {
      return { steps };
    },
    template: `
      <Stepper :steps="steps" submitting>
        <template #content="{ currentStep }">
          <div class="p-4">Current step: {{ currentStep }}</div>
        </template>
      </Stepper>
    `
  })
};
