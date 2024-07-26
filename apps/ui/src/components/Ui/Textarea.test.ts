// @vitest-environment happy-dom
import { mount } from '@vue/test-utils';
import { expect, it } from 'vitest';
import Textarea from './Textarea.vue';

const definition = {
  type: 'string',
  format: 'long',
  title: 'About',
  maxLength: 256,
  examples: ['Tell your story']
};

it('should render title & example', () => {
  const wrapper = mount(Textarea, {
    props: {
      definition
    }
  });

  expect(wrapper.text()).toContain(definition.title);
  expect(wrapper.find('textarea').attributes().placeholder).toBe(
    definition.examples[0]
  );
});

it('should render current length', async () => {
  const wrapper = mount(Textarea, {
    props: {
      definition
    }
  });

  expect(wrapper.text()).toContain('0 / 256');

  await wrapper.find('textarea').setValue('12345');

  expect(wrapper.text()).toContain('5 / 256');
});

it('should render error', async () => {
  const error = 'Input error';

  const wrapper = mount(Textarea, {
    props: {
      definition,
      error
    }
  });

  await wrapper.find('textarea').setValue('dirty value');

  expect(wrapper.find('.s-input-error-message').text()).toBe(error);
});
