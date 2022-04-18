import { createRouter, createWebHashHistory } from 'vue-router';
import Home from '@/views/Home.vue';
import Space from '@/views/Space.vue';
import Overview from '@/views/Space/Overview.vue';
import Proposals from '@/views/Space/Proposals.vue';
import Settings from '@/views/Space/Settings.vue';
import Create from '@/views/Create.vue';
import Editor from '@/views/Create/Editor.vue';
import Treasury from '@/views/Space/Treasury.vue';
import Profile from '@/views/Space/Profile.vue';
import Voting from '@/views/Space/Voting.vue';
import Proposal from '@/views/Proposal.vue';
import Playground from '@/views/Playground.vue';
import User from '@/views/User.vue';

const routes: any[] = [
  { path: '/', name: 'home', component: Home },
  { path: '/:id', component: Space, children: [
      { path: '', name: 'overview', component: Overview },
      { path: 'proposals', name: 'proposals', component: Proposals },
      { path: 'settings', name: 'settings', component: Settings },
      { path: 'treasury', name: 'treasury', component: Treasury },
      { path: 'profile', name: 'profile', component: Profile },
      { path: 'voting', name: 'voting', component: Voting },
    ]
  },
  { path: '/:id/create/:key?', component: Create, children: [
      { path: '', name: 'editor', component: Editor }
    ]
  },
  { path: '/:space/proposal/:id?', name: 'proposal', component: Proposal },
  { path: '/:id/create', name: 'create', component: Create },
  { path: '/profile/:id', name: 'user', component: User },
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
