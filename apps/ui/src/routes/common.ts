import { RouteRecordRaw } from 'vue-router';
import ProposalExecution from '@/views/Proposal/Execution.vue';
import ProposalOverview from '@/views/Proposal/Overview.vue';
import ProposalVotes from '@/views/Proposal/Votes.vue';
import Proposal from '@/views/Proposal.vue';
import SpaceDelegates from '@/views/Space/Delegates.vue';
import SpaceDiscussions from '@/views/Space/Discussions.vue';
import SpaceEditor from '@/views/Space/Editor.vue';
import SpaceLeaderboard from '@/views/Space/Leaderboard.vue';
import SpaceOverview from '@/views/Space/Overview.vue';
import SpacePro from '@/views/Space/Pro.vue';
import SpaceProposals from '@/views/Space/Proposals.vue';
import SpaceSettings from '@/views/Space/Settings.vue';
import SpaceTreasury from '@/views/Space/Treasury.vue';
import SpaceUserDelegators from '@/views/SpaceUser/Delegators.vue';
import SpaceUserProposals from '@/views/SpaceUser/Proposals.vue';
import SpaceUserStatement from '@/views/SpaceUser/Statement.vue';
import SpaceUserVotes from '@/views/SpaceUser/Votes.vue';
import SpaceUser from '@/views/SpaceUser.vue';
import Topic from '@/views/Topic.vue';

export const spaceChildrenRoutes: RouteRecordRaw[] = [
  {
    path: 'create/:key?',
    name: 'space-editor',
    component: SpaceEditor
  },
  { path: '', name: 'space-overview', component: SpaceOverview },
  { path: 'about', redirect: { name: 'space-overview' } },
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
      { path: 'votes', name: 'space-proposal-votes', component: ProposalVotes },
      {
        path: 'execution',
        name: 'space-proposal-execution',
        component: ProposalExecution
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
  },
  { path: 'pro', name: 'space-pro', component: SpacePro }
];
