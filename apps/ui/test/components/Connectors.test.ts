// @vitest-environment happy-dom
import { mount } from '@vue/test-utils';
import { expect, it } from 'vitest';
import Connectors from '@/components/Connectors.vue';

it('renders Oath using the native wallet row and emits its WalletConnect connector', async () => {
  const wrapper = mount(Connectors, { global: { stubs: { UiPill: true } } });
  const buttons = wrapper.findAll('button');
  const oath = buttons.find(button => button.text() === 'Oath Wallet')!;
  const walletConnect = buttons.find(
    button => button.text() === 'WalletConnect'
  )!;
  expect(oath.exists()).toBe(true);
  expect(oath.attributes('class')).toBe(walletConnect.attributes('class'));
  expect(oath.find('img').attributes('width')).toBe('28');
  expect(oath.find('img').attributes('class')).toBe(
    walletConnect.find('img').attributes('class')
  );
  await oath.trigger('click');
  expect(wrapper.emitted('click')?.[0]?.[0]).toMatchObject({
    id: 'oath-wallet',
    type: 'walletconnect',
    options: { wallet: { name: 'Oath Wallet', mobile_link: 'oathwallet://' } }
  });
  wrapper.unmount();
});

it('does not advertise Oath for a Starknet-only connection', () => {
  const wrapper = mount(Connectors, {
    props: { supportedConnectors: ['argentx'] },
    global: { stubs: { UiPill: true } }
  });
  expect(wrapper.text()).not.toContain('Oath Wallet');
  expect(wrapper.text()).not.toContain('WalletConnect');
  expect(wrapper.text()).toContain('Starknet');
  wrapper.unmount();
});
