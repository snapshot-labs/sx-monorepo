import { createRouter, createWebHashHistory } from 'vue-router';
import Home from '@/views/Home.vue';
import Space from '@/views/Space.vue';
import SpaceOverview from '@/views/Space/Overview.vue';
import SpaceProposals from '@/views/Space/Proposals.vue';
import SpaceSearchProposals from '@/views/Space/SearchProposals.vue';
import SpaceSettings from '@/views/Space/Settings.vue';
import SpaceTreasury from '@/views/Space/Treasury.vue';
import SpaceDelegates from '@/views/Space/Delegates.vue';
import Editor from '@/views/Editor.vue';
import Proposal from '@/views/Proposal.vue';
import User from '@/views/User.vue';
import Create from '@/views/Create.vue';
import Settings from '@/views/Settings.vue';
import Contacts from '@/views/Settings/Contacts.vue';
import Explore from '@/views/Explore.vue';
import SettingsSpaces from '@/views/Settings/Spaces.vue';

const routes: any[] = [
  { path: '/', name: 'home', component: Home },
  {
    path: '/:id',
    name: 'space',
    component: Space,
    children: [
      { path: '', name: 'space-overview', component: SpaceOverview },
      { path: 'proposals', name: 'space-proposals', component: SpaceProposals },
      { path: 'search', name: 'space-search-proposals', component: SpaceSearchProposals },
      { path: 'settings', name: 'space-settings', component: SpaceSettings },
      { path: 'treasury', name: 'space-treasury', component: SpaceTreasury },
      { path: 'delegates', name: 'space-delegates', component: SpaceDelegates }
    ]
  },
  {
    path: '/:id/create/:key?',
    name: 'editor',
    component: Editor
  },
  { path: '/:space/proposal/:id?', name: 'proposal', component: Proposal },
  { path: '/profile/:id', name: 'user', component: User },
  { path: '/create', name: 'create', component: Create },
  {
    path: '/settings',
    name: 'settings',
    component: Settings,
    children: [
      { path: '', name: 'settings-spaces', component: SettingsSpaces },
      { path: 'contacts', name: 'settings-contacts', component: Contacts }
    ]
  },
  { path: '/explore', name: 'explore', component: Explore }
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
