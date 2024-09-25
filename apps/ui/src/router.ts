import { createRouter, createWebHashHistory } from 'vue-router';
import App from '@/views/App.vue';
import Create from '@/views/Create.vue';
import Ecosystem from '@/views/Ecosystem.vue';
import Landing from '@/views/Landing.vue';
import Explore from '@/views/My/Explore.vue';
import Home from '@/views/My/Home.vue';
import Notifications from '@/views/My/Notifications.vue';
import My from '@/views/My.vue';
import Network from '@/views/Network.vue';
import Policy from '@/views/Policy.vue';
import ProposalOverview from '@/views/Proposal/Overview.vue';
import ProposalVotes from '@/views/Proposal/Votes.vue';
import Proposal from '@/views/Proposal.vue';
import Contacts from '@/views/Settings/Contacts.vue';
import SettingsSpaces from '@/views/Settings/Spaces.vue';
import Settings from '@/views/Settings.vue';
import Site from '@/views/Site.vue';
import SpaceDelegates from '@/views/Space/Delegates.vue';
import SpaceDiscussions from '@/views/Space/Discussions.vue';
import SpaceEditor from '@/views/Space/Editor.vue';
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
import Terms from '@/views/Terms.vue';
import Topic from '@/views/Topic.vue';
import User from '@/views/User.vue';

const routes: any[] = [
  {
    path: '/',
    name: 'site',
    component: Site,
    children: [
      { path: '', name: 'site-landing', component: Landing },
      { path: '/network', name: 'site-network', component: Network },
      { path: '/ecosystem', name: 'site-ecosystem', component: Ecosystem },
      { path: '/ecosystem/:app', name: 'site-app', component: App },
      { path: '/terms-of-use', name: 'site-terms', component: Terms },
      { path: '/privacy-policy', name: 'site-policy', component: Policy }
    ]
  },
  {
    path: '/:space',
    name: 'space',
    component: Space,
    children: [
      { path: '', name: 'space-overview', component: SpaceOverview },
      {
        path: 'create/:key?',
        name: 'space-editor',
        component: SpaceEditor
      },
      { path: 'proposals', name: 'space-proposals', component: SpaceProposals },
      {
        path: 'proposal/:proposal?',
        name: 'space-proposal',
        component: Proposal,
        children: [
          {
            path: '',
            name: 'space-proposal-overview',
            component: ProposalOverview
          },
          {
            path: 'votes',
            name: 'space-proposal-votes',
            component: ProposalVotes
          },
          {
            path: 'discussion',
            name: 'space-proposal-discussion',
            component: Topic
          }
        ]
      },
      {
        path: 'discussions',
        name: 'space-discussions',
        component: SpaceDiscussions
      },
      {
        path: 'discussions/:topic',
        name: 'space-discussions-topic',
        component: Topic
      },
      { path: 'search', name: 'space-search', component: SpaceSearch },
      {
        path: 'settings/:tab?',
        name: 'space-settings',
        component: SpaceSettings
      },
      {
        path: 'treasury/:index?/:tab?',
        name: 'space-treasury',
        component: SpaceTreasury
      },
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
      { path: '/profile/:user', name: 'user', component: User }
    ]
  }
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition;
    if (to.params.retainScrollPosition) return {};
    if (
      to.name === 'space-treasury' &&
      to.params.index === from.params.index &&
      to.params.tab !== from.params.tab
    )
      return {};
    if (to.hash) {
      return { el: to.hash, behavior: 'smooth' };
    }
    return { top: 0 };
  }
});

export default router;
