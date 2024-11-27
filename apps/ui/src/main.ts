import { LockPlugin } from '@snapshot-labs/lock/plugins/vue3';
import { createPinia } from 'pinia';
import VueTippy from 'vue-tippy';
import App from '@/App.vue';
import options from '@/helpers/auth';
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
  'safe.fantom.network'
];
const parentUrl =
  window.location != window.parent.location
    ? document.referrer ||
      document.location.ancestorOrigins[
        document.location.ancestorOrigins.length - 1
      ]
    : document.location.href;
const parentHost = new URL(parentUrl).host;
if (window !== window.parent && !knownHosts.includes(parentHost)) {
  document.documentElement.style.display = 'none';
  throw new Error(`Unknown host: ${parentHost}`);
}

const pinia = createPinia();
const app = createApp({ render: () => h(App) })
  .use(router)
  .use(LockPlugin, options)
  .use(VueTippy, {
    defaultProps: {
      delay: [0, null],
      theme: 'sx',
      animation: false
    }
  });

app.use(pinia);

app.mount('#app');

export default app;
