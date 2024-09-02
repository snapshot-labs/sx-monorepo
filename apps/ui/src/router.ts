import { createRouter, createWebHashHistory } from 'vue-router';
import App from '@/views/App.vue';
import Apps from '@/views/Apps.vue';
import Create from '@/views/Create.vue';
import Editor from '@/views/Editor.vue';
import Landing from '@/views/Landing.vue';
import Explore from '@/views/My/Explore.vue';
import Home from '@/views/My/Home.vue';
import Notifications from '@/views/My/Notifications.vue';
import My from '@/views/My.vue';
import Network from '@/views/Network.vue';
import ProposalDiscussion from '@/views/Proposal/Discussion.vue';
import ProposalOverview from '@/views/Proposal/Overview.vue';
import ProposalVotes from '@/views/Proposal/Votes.vue';
import Proposal from '@/views/Proposal.vue';
import Contacts from '@/views/Settings/Contacts.vue';
import SettingsSpaces from '@/views/Settings/Spaces.vue';
import Settings from '@/views/Settings.vue';
import SpaceDelegates from '@/views/Space/Delegates.vue';
import SpaceDiscussions from '@/views/Space/Discussions.vue';
import SpaceLeaderboard from '@/views/Space/Leaderboard.vue';
import SpaceOverview from '@/views/Space/Overview.vue';
import SpaceProposals from '@/views/Space/Proposals.vue';
import SpaceSearch from '@/views/Space/Search.vue';
import SpaceSettings from '@/views/Space/Settings.vue';
import SpaceTreasury from '@/views/Space/Treasury.vue';
import Space from '@/views/Space.vue';
import SpaceUserDelegators from '@/views/SpaceUser/Delegators.vue';
import SpaceUserProposals from '@/views/SpaceUser/Proposals.vue';
import SpaceUserStatement from '@/views/SpaceUser/Statement.vue';
import SpaceUserVotes from '@/views/SpaceUser/Votes.vue';
import SpaceUser from '@/views/SpaceUser.vue';
import User from '@/views/User.vue';

const routes: any[] = [
  { path: '/', name: 'landing', component: Landing },
  {
    path: '/:id',
    name: 'space',
    component: Space,
    children: [
      { path: '', name: 'space-overview', component: SpaceOverview },
      { path: 'proposals', name: 'space-proposals', component: SpaceProposals },
      {
        path: 'discussions',
        name: 'space-discussions',
        component: SpaceDiscussions
      },
      { path: 'search', name: 'space-search', component: SpaceSearch },
      {
        path: 'settings',
        name: 'space-settings',
        component: SpaceSettings
      },
      { path: 'treasury', name: 'space-treasury', component: SpaceTreasury },
      { path: 'delegates', name: 'space-delegates', component: SpaceDelegates },
      {
        path: 'leaderboard',
        name: 'space-leaderboard',
        component: SpaceLeaderboard
      },
      {
        path: 'profile/:user',
        name: 'space-user',
        component: SpaceUser,
        children: [
          {
            path: '',
            name: 'space-user-statement',
            component: SpaceUserStatement
          },
          {
            path: 'delegators',
            name: 'space-user-delegators',
            component: SpaceUserDelegators
          },
          {
            path: 'proposals',
            name: 'space-user-proposals',
            component: SpaceUserProposals
          },
          { path: 'votes', name: 'space-user-votes', component: SpaceUserVotes }
        ]
      }
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
      { path: 'votes', name: 'proposal-votes', component: ProposalVotes },
      {
        path: 'discussion',
        name: 'proposal-discussion',
        component: ProposalDiscussion
      }
    ]
  },
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
      { path: '/explore', name: 'my-explore', component: Explore },
      {
        path: '/notifications',
        name: 'my-notifications',
        component: Notifications
      },
      { path: '/profile/:id', name: 'user', component: User }
    ]
  },
  { path: '/apps', name: 'apps', component: Apps },
  { path: '/apps/:id', name: 'app', component: App },
  { path: '/network', name: 'network', component: Network }
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
