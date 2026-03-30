import { createTune } from '@snapshot-labs/tune';
import { VueQueryPlugin } from '@tanstack/vue-query';
import { createPinia } from 'pinia';
import App from '@/App.vue';
import { useAppRouter } from '@/composables/useAppRouter';
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
  'console.brahma.fi',
  'pass.celopg.eco',
  'app.cg'
];
const parentUrl =
  window.location != window.parent.location
    ? document.referrer ||
      document.location.ancestorOrigins[
        document.location.ancestorOrigins.length - 1
      ]
    : document.location.href;
const parentHost = new URL(parentUrl).host;

if (window.location.host !== parentHost && !knownHosts.includes(parentHost)) {
  document.documentElement.style.display = 'none';
  throw new Error(`Unknown host: ${parentHost}`);
}

const pinia = createPinia();
const tune = createTune({
  useRouter: useAppRouter,
  iframelyApiKey: 'd155718c86be7d5305ccb6'
});
const app = createApp({ render: () => h(App) })
  .use(router)
  .use(tune);

app.use(pinia);
app.use(VueQueryPlugin);

app.mount('#app');

export default app;
