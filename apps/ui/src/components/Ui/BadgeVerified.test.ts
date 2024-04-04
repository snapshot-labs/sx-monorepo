// @vitest-environment happy-dom
import { it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import VueTippy from 'vue-tippy';
import BadgeVerified from './BadgeVerified.vue';

const TURBO_CLASS = 'text-[#e2b719]';
const VERIFIED_CLASS = 'text-[#2394ea]';

const GLOBAL = {
  plugins: [VueTippy]
};

it('should use verified color if only verified', () => {
  const wrapper = mount(BadgeVerified, {
    props: {
      verified: true,
      turbo: false
    },
    global: GLOBAL
  });

  expect(wrapper.element.children[0].classList.toString()).toBe(VERIFIED_CLASS);
});

it('should use turbo color if both verified and turbo', () => {
  const wrapper = mount(BadgeVerified, {
    props: {
      verified: true,
      turbo: true
    },
    global: GLOBAL
  });

  expect(wrapper.element.children[0].classList.toString()).toBe(TURBO_CLASS);
});
