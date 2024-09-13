import { RouteRecordRaw, RouteRecordSingleView } from 'vue-router';
import Editor from '@/views/Editor.vue';
import ProposalOverview from '@/views/Proposal/Overview.vue';
import ProposalVotes from '@/views/Proposal/Votes.vue';
import Proposal from '@/views/Proposal.vue';
import SpaceDelegates from '@/views/Space/Delegates.vue';
import SpaceDiscussions from '@/views/Space/Discussions.vue';
import SpaceLeaderboard from '@/views/Space/Leaderboard.vue';
import SpaceOverview from '@/views/Space/Overview.vue';
import SpaceProposals from '@/views/Space/Proposals.vue';
import SpaceSearch from '@/views/Space/Search.vue';
import SpaceSettings from '@/views/Space/Settings.vue';
import SpaceTreasury from '@/views/Space/Treasury.vue';
import SpaceUserDelegators from '@/views/SpaceUser/Delegators.vue';
import SpaceUserProposals from '@/views/SpaceUser/Proposals.vue';
import SpaceUserStatement from '@/views/SpaceUser/Statement.vue';
import SpaceUserVotes from '@/views/SpaceUser/Votes.vue';
import SpaceUser from '@/views/SpaceUser.vue';
import Topic from '@/views/Topic.vue';

export const spaceChildrenRoutes: RouteRecordRaw[] = [
  { path: '', name: 'space-overview', component: SpaceOverview },
  { path: 'proposals', name: 'space-proposals', component: SpaceProposals },
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
];

export const SpaceProposalCreate: RouteRecordSingleView = {
  path: '/create/:key?',
  name: 'editor',
  component: Editor
};

export const SpaceProposal = {
  path: '/proposal/:id?',
  name: 'proposal',
  component: Proposal,
  children: [
    { path: '', name: 'proposal-overview', component: ProposalOverview },
    { path: 'votes', name: 'proposal-votes', component: ProposalVotes },
    {
      path: 'discussion',
      name: 'proposal-discussion',
      component: Topic
    }
  ]
};
