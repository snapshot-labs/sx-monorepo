import { RouteRecordRaw } from 'vue-router';
import Contacts from '@/views/Settings/Contacts.vue';
import Settings from '@/views/Settings.vue';
import Space from '@/views/Space.vue';
import { spaceChildrenRoutes } from './common';

const whiteLabelRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'space',
    component: Space,
    children: spaceChildrenRoutes
  },
  {
    path: '/contacts',
    name: 'settings',
    component: Settings,
    children: [{ path: '', name: 'settings-contacts', component: Contacts }]
  }
];

export default whiteLabelRoutes;
