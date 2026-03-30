import { Meta, StoryObj } from '@storybook/vue3-vite';
import Carousel from './Carousel.vue';

const meta = {
  title: 'Ui/Carousel',
  component: Carousel,
  tags: ['autodocs']
} satisfies Meta<typeof Carousel>;

export default meta;
type Story = StoryObj<typeof meta>;

const carouselContent = `<div style="display: flex; min-width: max-content; gap: 24px; padding-right: 24px;">
      <div style="width: 192px; padding: 16px; background: white; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h3 style="font-weight: 600; margin-bottom: 8px;">Card Title 1</h3>
        <p style="font-size: 14px; color: #6b7280;">This is a sample card content for the carousel.</p>
      </div>
      <div style="width: 192px; padding: 16px; background: white; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h3 style="font-weight: 600; margin-bottom: 8px;">Card Title 2</h3>
        <p style="font-size: 14px; color: #6b7280;">Another card with different content to show variety.</p>
      </div>
      <div style="width: 192px; padding: 16px; background: white; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h3 style="font-weight: 600; margin-bottom: 8px;">Card Title 3</h3>
        <p style="font-size: 14px; color: #6b7280;">Third card demonstrating the carousel functionality.</p>
      </div>
      <div style="width: 192px; padding: 16px; background: white; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h3 style="font-weight: 600; margin-bottom: 8px;">Card Title 4</h3>
        <p style="font-size: 14px; color: #6b7280;">Fourth card to show continuous scrolling effect.</p>
      </div>
    </div>`;

export const Default: Story = {
  args: {},
  render: args => ({
    components: { Carousel },
    setup() {
      return { args };
    },
    template: `
      <Carousel v-bind="args">
        ${carouselContent}
      </Carousel>
    `
  }),
  parameters: {
    docs: {
      source: {
        code: `<template>
  <Carousel>
    ${carouselContent}
  </Carousel>
</template>`
      }
    }
  }
};
