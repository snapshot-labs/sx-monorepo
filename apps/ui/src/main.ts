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
app.use(
  VueGtag,
  {
    bootstrap: import.meta.env.PROD,
    pageTrackerSkipSamePath: false,
    pageTrackerTemplate: to => ({
      page_title: to.name,
      page_path: to.path,
      page_location: window.location.href
    }),
    config: {
      id: import.meta.env.VITE_GA_MEASUREMENT_ID,
      params: { anonymize_ip: true }
    }
  },
  router
);

app.mount('#app');

export default app;
