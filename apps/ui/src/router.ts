import { createRouter, createWebHashHistory } from 'vue-router';
import Landing from '@/views/Landing.vue';
import Space from '@/views/Space.vue';
import SpaceOverview from '@/views/Space/Overview.vue';
import SpaceProposals from '@/views/Space/Proposals.vue';
import SpaceSearch from '@/views/Space/Search.vue';
import SpaceSettings from '@/views/Space/Settings.vue';
import SpaceEditSettings from '@/views/Space/EditSettings.vue';
import SpaceTreasury from '@/views/Space/Treasury.vue';
import SpaceDelegates from '@/views/Space/Delegates.vue';
import Editor from '@/views/Editor.vue';
import Proposal from '@/views/Proposal.vue';
import ProposalOverview from '@/views/Proposal/Overview.vue';
import ProposalVotes from '@/views/Proposal/Votes.vue';
import User from '@/views/User.vue';
import Create from '@/views/Create.vue';
import Settings from '@/views/Settings.vue';
import Contacts from '@/views/Settings/Contacts.vue';
import My from '@/views/My.vue';
import Home from '@/views/My/Home.vue';
import Explore from '@/views/My/Explore.vue';
import SettingsSpaces from '@/views/Settings/Spaces.vue';
import Apps from '@/views/Apps.vue';
import App from '@/views/App.vue';

const { mixpanel } = useMixpanel();

const routes: any[] = [
  { path: '/', name: 'landing', component: Landing },
  {
    path: '/:id',
    name: 'space',
    component: Space,
    children: [
      { path: '', name: 'space-overview', component: SpaceOverview },
      { path: 'proposals', name: 'space-proposals', component: SpaceProposals },
      { path: 'search', name: 'space-search', component: SpaceSearch },
      { path: 'settings', name: 'space-settings', component: SpaceSettings },
      { path: 'edit-settings', name: 'space-edit-settings', component: SpaceEditSettings },
      { path: 'treasury', name: 'space-treasury', component: SpaceTreasury },
      { path: 'delegates', name: 'space-delegates', component: SpaceDelegates }
    ]
  },
  {
    path: '/:id/create/:key?',
    name: 'editor',
    component: Editor
  },
  {
    path: '/:space/proposal/:id?',
    name: 'proposal',
    component: Proposal,
    children: [
      { path: '', name: 'proposal-overview', component: ProposalOverview },
      { path: 'votes', name: 'proposal-votes', component: ProposalVotes }
    ]
  },
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
  {
    path: '/home',
    name: 'my',
    component: My,
    children: [
      { path: '/home', name: 'my-home', component: Home },
      { path: '/explore', name: 'my-explore', component: Explore }
    ]
  },
  { path: '/apps', name: 'apps', component: Apps },
  { path: '/apps/:id', name: 'app', component: App }
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

router.afterEach(to => {
  mixpanel.track_pageview({
    page_name: to.name,
    page_path: to.path
  });
});

export default router;
