import { createRouter, createWebHashHistory } from 'vue-router';
import Home from '@/views/Home.vue';
import Space from '@/views/Space.vue';
import Proposal from '@/views/Proposal.vue';
import Proposals from '@/views/Proposals.vue';
import Settings from '@/views/Settings.vue';
import Create from '@/views/Create.vue';
import Execution from '@/views/Execution.vue';
import Treasury from '@/views/Treasury.vue';
import Playground from '@/views/Playground.vue';

const routes: any[] = [
  { path: '/', name: 'home', component: Home },
  { path: '/:id', name: 'space', component: Space, children: [
      { path: '', name: 'proposals', component: Proposals },
      { path: 'settings', name: 'settings', component: Settings },
      { path: 'treasury', name: 'treasury', component: Treasury }
    ]
  },
  { path: '/:space/proposal/:id?', name: 'proposal', component: Proposal },
  { path: '/:id/create', name: 'create', component: Create },
  { path: '/:id/execution', name: 'execution', component: Execution },
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
