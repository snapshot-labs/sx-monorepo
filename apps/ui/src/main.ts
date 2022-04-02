import { Buffer } from 'buffer';
(window as any).Buffer = Buffer;
import { createApp, h } from 'vue';
import { LockPlugin } from '@snapshot-labs/lock/plugins/vue3';
import options from '@/helpers/auth';
import App from '@/App.vue';
import router from '@/router';
import '@/helpers/auth';
import '@/style.scss';

const app = createApp({ render: () => h(App) })
  .use(router)
  .use(LockPlugin, options);
app.mount('#app');

export default app;
