import { createRouter, createWebHashHistory } from 'vue-router';
import SplashScreen from '@/components/Layout/SplashScreen.vue';
import defaultRoutes from './default';

const { resolved } = useWhiteLabel();

const splashScreenRoute = {
  path: '/:catchAll(.*)*',
  name: 'splash-screen',
  component: SplashScreen
};

// At this stage, we're not sure whether the app is a white label
const routes = !resolved.value ? [splashScreenRoute] : defaultRoutes;

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
