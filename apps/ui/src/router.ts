import { createRouter, createWebHashHistory } from 'vue-router';
import Home from '@/views/Home.vue';
import Org from '@/views/Org.vue';
import Space from '@/views/Space.vue';
import Proposal from '@/views/Proposal.vue';
import Settings from '@/views/Settings.vue';
import Create from '@/views/Create.vue';
import Playground from '@/views/Playground.vue';

const routes: any[] = [
  { path: '/', name: 'home', component: Home },
  { path: '/org/:id', name: 'org', component: Org },
  { path: '/space/:id', name: 'space', component: Space },
  { path: '/proposal/:id?', name: 'proposal', component: Proposal },
  { path: '/settings/:id?', name: 'settings', component: Settings },
  { path: '/:id/create', name: 'create', component: Create },
  { path: '/playground', name: 'playground', component: Playground }
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition;
    if (to.params.retainScrollPosition) return {};
    if (to.hash) {
      const position = { selector: to.hash };
      return { el: position };
    }
    return { top: 0 };
  }
});

export default router;
