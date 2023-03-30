import { createRouter, createWebHashHistory } from 'vue-router';
import Home from '@/views/Home.vue';
import Space from '@/views/Space.vue';
import SpaceOverview from '@/views/Space/Overview.vue';
import SpaceProposals from '@/views/Space/Proposals.vue';
import SpaceSearchProposals from '@/views/Space/SearchProposals.vue';
import SpaceSettings from '@/views/Space/Settings.vue';
import SpaceTreasury from '@/views/Space/Treasury.vue';
import SpaceEditor from '@/views/Editor.vue';
import Proposal from '@/views/Proposal.vue';
import User from '@/views/User.vue';
import Create from '@/views/Create.vue';
import Settings from '@/views/Settings.vue';
import Contacts from '@/views/Settings/Contacts.vue';
import Explore from '@/views/Explore.vue';

const routes: any[] = [
  { path: '/', name: 'home', component: Home },
  { path: '/explore', name: 'explore', component: Explore },
  { path: '/create', name: 'create', component: Create },
  {
    path: '/:id([^:]+:[A-Za-z0-9]+)',
    name: 'space',
    component: Space,
    children: [
      { path: '', name: 'space-overview', component: SpaceOverview },
      { path: 'proposals', name: 'space-proposals', component: SpaceProposals },
      { path: 'search', name: 'space-search-proposals', component: SpaceSearchProposals },
      { path: 'settings', name: 'space-settings', component: SpaceSettings },
      { path: 'treasury', name: 'space-treasury', component: SpaceTreasury },
      { path: 'create/:key?', name: 'editor', component: SpaceEditor },
      { path: 'proposal/:pid', name: 'proposal', component: Proposal }
    ]
  },
  {
    path: '/profile/:id',
    name: 'user',
    component: User
  },
  {
    path: '/settings',
    name: 'settings',
    component: Settings,
    children: [
      { path: '', redirect: '/settings/contacts' },
      { path: 'contacts', name: 'settings-contacts', component: Contacts }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'error-404',
    redirect: '/'
  }
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
