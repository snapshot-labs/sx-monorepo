// @vitest-environment happy-dom
import { mount } from '@vue/test-utils';
import { expect, it } from 'vitest';
import InputString from './InputString.vue';

const definition = {
  type: 'string',
  title: 'Name',
  maxLength: 50,
  examples: ['Enter your name']
};

it('should render title & example', () => {
  const wrapper = mount(InputString, {
    props: {
      definition
    }
  });

  expect(wrapper.text()).toContain(definition.title);
  expect(wrapper.find('input').attributes().placeholder).toBe(
    definition.examples[0]
  );
});

it('should render current length', async () => {
  const wrapper = mount(InputString, {
    props: {
      definition
    }
  });

  expect(wrapper.text()).toContain('0 / 50');

  await wrapper.find('input').setValue('hello');

  expect(wrapper.text()).toContain('5 / 50');
});

it('should render error', async () => {
  const error = 'Input error';

  const wrapper = mount(InputString, {
    props: {
      definition,
      error
    }
  });

  await wrapper.find('input').setValue('dirty value');

  expect(wrapper.find('.s-input-error-message').text()).toBe(error);
});

it('should trim input value', async () => {
  const wrapper = mount(InputString, {
    props: {
      definition
    }
  });

  await wrapper.find('input').setValue('  hello  ');

  expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).toBe('hello');
});

it('should show error when input is dirtied', async () => {
  const error = 'Input error';
  const originalValue = 'original';
  const definitionWithDefault = {
    ...definition,
    default: originalValue
  };

  const wrapper = mount(InputString, {
    props: {
      definition: definitionWithDefault,
      error,
      modelValue: originalValue
    }
  });

  await wrapper.vm.$nextTick();
  expect(wrapper.find('.s-input-error-message').exists()).toBe(false);

  await wrapper.find('input').setValue('changed value');
  await wrapper.vm.$nextTick();

  expect(wrapper.find('.s-input-error-message').text()).toBe(error);
});

it('should show error when initialized with invalid value different from default', () => {
  const error = 'Input error';
  const definitionWithDefault = {
    ...definition,
    default: 'valid default'
  };
  const invalidValue = 'invalid value';

  const wrapper = mount(InputString, {
    props: {
      definition: definitionWithDefault,
      error,
      modelValue: invalidValue
    }
  });

  expect(wrapper.find('.s-input-error-message').text()).toBe(error);
  expect(wrapper.find('input').element.value).toBe(invalidValue);
});

it('should not show error when initialized with valid value same as default', () => {
  const error = 'Input error';
  const defaultValue = 'valid default';
  const definitionWithDefault = {
    ...definition,
    default: defaultValue
  };

  const wrapper = mount(InputString, {
    props: {
      definition: definitionWithDefault,
      error,
      modelValue: defaultValue
    }
  });

  expect(wrapper.find('.s-input-error-message').exists()).toBe(false);
  expect(wrapper.find('input').element.value).toBe(defaultValue);
});
