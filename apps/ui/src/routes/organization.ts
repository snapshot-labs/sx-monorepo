import { RouteRecordRaw } from 'vue-router';
import Organization from '@/views/Organization.vue';
import ProposalExecution from '@/views/Proposal/Execution.vue';
import ProposalOverview from '@/views/Proposal/Overview.vue';
import ProposalVotes from '@/views/Proposal/Votes.vue';
import Proposal from '@/views/Proposal.vue';
import Contacts from '@/views/Settings/Contacts.vue';
import Settings from '@/views/Settings.vue';
import SpaceDelegates from '@/views/Space/Delegates.vue';
import SpaceDiscussions from '@/views/Space/Discussions.vue';
import SpaceEditor from '@/views/Space/Editor.vue';
import SpaceOverview from '@/views/Space/Overview.vue';
import SpaceProposals from '@/views/Space/Proposals.vue';
import SpaceTreasury from '@/views/Space/Treasury.vue';
import SpaceUserProposals from '@/views/SpaceUser/Proposals.vue';
import SpaceUserStatement from '@/views/SpaceUser/Statement.vue';
import SpaceUserVotes from '@/views/SpaceUser/Votes.vue';
import SpaceUser from '@/views/SpaceUser.vue';
import Topic from '@/views/Topic.vue';

const orgChildrenRoutes: RouteRecordRaw[] = [
  { path: '', name: 'org-overview', component: SpaceOverview },
  {
    path: ':space/create/:key?',
    name: 'org-editor',
    component: SpaceEditor
  },
  { path: 'proposals', name: 'org-proposals', component: SpaceProposals },
  {
    path: ':space/proposals',
    name: 'org-space-proposals',
    component: SpaceProposals
  },
  { path: 'polls', name: 'org-polls', component: SpaceProposals },
  {
    path: ':space/proposal/:proposal?',
    name: 'org-proposal',
    component: Proposal,
    children: [
      {
        path: '',
        name: 'org-proposal-overview',
        component: ProposalOverview
      },
      { path: 'votes', name: 'org-proposal-votes', component: ProposalVotes },
      {
        path: 'execution',
        name: 'org-proposal-execution',
        component: ProposalExecution
      },
      {
        path: 'discussion',
        name: 'org-proposal-discussion',
        component: Topic
      }
    ]
  },
  {
    path: 'discussions',
    name: 'org-discussions',
    component: SpaceDiscussions
  },
  {
    path: 'discussions/:topic',
    name: 'org-discussions-topic',
    component: Topic
  },
  { path: 'delegates', name: 'org-delegates', component: SpaceDelegates },
  {
    path: 'treasury/:index?/:tab?',
    name: 'org-treasury',
    component: SpaceTreasury
  },
  {
    path: 'profile/:user',
    name: 'org-user',
    component: SpaceUser,
    children: [
      {
        path: '',
        name: 'org-user-statement',
        component: SpaceUserStatement
      },
      {
        path: 'proposals',
        name: 'org-user-proposals',
        component: SpaceUserProposals
      },
      { path: 'votes', name: 'org-user-votes', component: SpaceUserVotes }
    ]
  }
];

// For default routes: /org/:org
export const orgRoute: RouteRecordRaw = {
  path: '/org/:org',
  name: 'org',
  component: Organization,
  children: orgChildrenRoutes
};

// For whitelabel routes: / (root)
export const orgRootRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'org',
    component: Organization,
    children: orgChildrenRoutes
  },
  {
    path: '/contacts',
    name: 'settings',
    component: Settings,
    children: [{ path: '', name: 'settings-contacts', component: Contacts }]
  }
];
