import { VueQueryPlugin } from '@tanstack/vue-query';
import { createPinia } from 'pinia';
import VueTippy from 'vue-tippy';
import App from '@/App.vue';
import router from '@/routes';
import '@/style.scss';

const knownHosts = [
  'app.safe.global',
  'pilot.gnosisguild.org',
  'metissafe.tech',
  'multisig.mantle.xyz',
  'wallet.ambire.com',
  'multisig.moonbeam.network',
  'worldassociation.org',
  'safe.mainnet.frax.com',
  'horizen-eon.safe.onchainden.com',
  'safe.fantom.network',
  'safe.apechain.com',
  'console.brahma.fi'
];
const parentUrl =
  window.location != window.parent.location
    ? document.referrer ||
      document.location.ancestorOrigins[
        document.location.ancestorOrigins.length - 1
      ]
    : document.location.href;
const parentHost = new URL(parentUrl).host;
if (
  window.location.host !== window.parent.location.host &&
  !knownHosts.includes(parentHost)
) {
  document.documentElement.style.display = 'none';
  throw new Error(`Unknown host: ${parentHost}`);
}

const pinia = createPinia();
const app = createApp({ render: () => h(App) })
  .use(router)
  .use(VueTippy, {
    defaultProps: {
      delay: [0, null],
      theme: 'sx',
      animation: false
    }
  });

app.use(pinia);
app.use(VueQueryPlugin);

app.mount('#app');

export default app;
