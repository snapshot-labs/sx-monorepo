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

function createOrgChildren(prefix: 'org' | 'space'): RouteRecordRaw[] {
  return [
    { path: '', name: `${prefix}-overview`, component: SpaceOverview },
    {
      path: ':space/create/:key?',
      name: `${prefix}-editor`,
      component: SpaceEditor
    },
    {
      path: ':space/proposals',
      name: `${prefix}-proposals`,
      component: SpaceProposals
    },
    {
      path: ':space/proposal/:proposal?',
      name: `${prefix}-proposal`,
      component: Proposal,
      children: [
        {
          path: '',
          name: `${prefix}-proposal-overview`,
          component: ProposalOverview
        },
        {
          path: 'votes',
          name: `${prefix}-proposal-votes`,
          component: ProposalVotes
        },
        {
          path: 'execution',
          name: `${prefix}-proposal-execution`,
          component: ProposalExecution
        },
        {
          path: 'discussion',
          name: `${prefix}-proposal-discussion`,
          component: Topic
        }
      ]
    },
    {
      path: 'discussions',
      name: `${prefix}-discussions`,
      component: SpaceDiscussions
    },
    {
      path: 'discussions/:topic',
      name: `${prefix}-discussions-topic`,
      component: Topic
    },
    {
      path: 'delegates',
      name: `${prefix}-delegates`,
      component: SpaceDelegates
    },
    {
      path: ':space/treasury/:index?/:tab?',
      name: `${prefix}-treasury`,
      component: SpaceTreasury
    },
    {
      path: 'profile/:user',
      name: `${prefix}-user`,
      component: SpaceUser,
      children: [
        {
          path: '',
          name: `${prefix}-user-statement`,
          component: SpaceUserStatement
        },
        {
          path: 'proposals',
          name: `${prefix}-user-proposals`,
          component: SpaceUserProposals
        },
        {
          path: 'votes',
          name: `${prefix}-user-votes`,
          component: SpaceUserVotes
        }
      ]
    }
  ];
}

// For default routes: /org/:org
export const orgRoute: RouteRecordRaw = {
  path: '/org/:org',
  name: 'org',
  component: Organization,
  children: createOrgChildren('org')
};

// For whitelabel routes: / (root)
export const orgRootRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'org',
    component: Organization,
    children: createOrgChildren('space')
  },
  {
    path: '/contacts',
    name: 'settings',
    component: Settings,
    children: [{ path: '', name: 'settings-contacts', component: Contacts }]
  }
];
