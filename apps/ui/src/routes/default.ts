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
import Contacts from '@/views/Settings/Contacts.vue';
import SettingsSpaces from '@/views/Settings/Spaces.vue';
import Settings from '@/views/Settings.vue';
import Site from '@/views/Site.vue';
import Space from '@/views/Space.vue';
import Terms from '@/views/Terms.vue';
import User from '@/views/User.vue';
import { spaceChildrenRoutes } from './common';

export default [
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
    children: spaceChildrenRoutes
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
