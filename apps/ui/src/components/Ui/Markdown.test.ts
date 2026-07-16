// @vitest-environment happy-dom
import { mount } from '@vue/test-utils';
import { expect, it, vi } from 'vitest';
import Markdown from './Markdown.vue';

vi.mock('@iconify-json/heroicons-outline', () => ({
  icons: { icons: { duplicate: { body: '' }, check: { body: '' } } }
}));

it('renders a fenced code block language label as text, not HTML', () => {
  const payload =
    "```<img src=1 onerror=[].constructor.constructor(atob('aW1wb3J0'))()>\n# treasury transfer\n```";

  const wrapper = mount(Markdown, {
    props: { body: payload },
    attachTo: document.body
  });

  expect(wrapper.element.querySelector('img')).toBeNull();
  expect(wrapper.find('.title-bar').text()).toContain('<img');

  wrapper.unmount();
});

it('does not execute onerror handlers smuggled through the fence info string', () => {
  const spy = vi.fn();
  (window as any).__xssProbe = spy;

  const payload = '```<img src=x onerror=window.__xssProbe()>\ncode\n```';

  const wrapper = mount(Markdown, {
    props: { body: payload },
    attachTo: document.body
  });

  expect(spy).not.toHaveBeenCalled();
  expect(wrapper.element.querySelector('img')).toBeNull();

  delete (window as any).__xssProbe;
  wrapper.unmount();
});
