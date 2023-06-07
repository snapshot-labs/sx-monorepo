import { createPinia } from 'pinia';
import { LockPlugin } from '@snapshot-labs/lock/plugins/vue3';
import VueGtag from 'vue-gtag';
import options from '@/helpers/auth';
import App from '@/App.vue';
import router from '@/router';
import '@/helpers/auth';
import '@/style.scss';

const knownHosts = ['app.safe.global', 'pilot.gnosisguild.org'];
const parentUrl =
  window.location != window.parent.location
    ? document.referrer ||
      document.location.ancestorOrigins[document.location.ancestorOrigins.length - 1]
    : document.location.href;
const parentHost = new URL(parentUrl).host;
if (window !== window.parent && !knownHosts.includes(parentHost)) {
  document.documentElement.style.display = 'none';
  throw new Error(`Unknown host: ${parentHost}`);
}

const pinia = createPinia();
const app = createApp({ render: () => h(App) })
  .use(router)
  .use(LockPlugin, options);

app.use(pinia);
app.use(VueGtag, {
  config: {
    id: 'G-8MQS50MVZX',
    pageTrackerSkipSamePath: false,
    params: { anonymize_ip: true }
  }
});

app.mount('#app');

export default app;
