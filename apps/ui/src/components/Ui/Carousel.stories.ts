import { Meta, StoryObj } from '@storybook/vue3-vite';
import Carousel from './Carousel.vue';

const meta = {
  title: 'Ui/Carousel',
  component: Carousel,
  tags: ['autodocs']
} satisfies Meta<typeof Carousel>;

export default meta;
type Story = StoryObj<typeof meta>;

const carouselContent = `<div class="flex min-w-max">
      <div class="w-48 p-4 bg-white border rounded-lg shadow-sm mx-3">
        <h3 class="font-semibold mb-2">Card Title 1</h3>
        <p class="text-sm text-gray-600">This is a sample card content for the carousel.</p>
      </div>
      <div class="w-48 p-4 bg-white border rounded-lg shadow-sm mx-3">
        <h3 class="font-semibold mb-2">Card Title 2</h3>
        <p class="text-sm text-gray-600">Another card with different content to show variety.</p>
      </div>
      <div class="w-48 p-4 bg-white border rounded-lg shadow-sm mx-3">
        <h3 class="font-semibold mb-2">Card Title 3</h3>
        <p class="text-sm text-gray-600">Third card demonstrating the carousel functionality.</p>
      </div>
      <div class="w-48 p-4 bg-white border rounded-lg shadow-sm mx-3">
        <h3 class="font-semibold mb-2">Card Title 4</h3>
        <p class="text-sm text-gray-600">Fourth card to show continuous scrolling effect.</p>
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
