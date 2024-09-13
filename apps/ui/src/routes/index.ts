import { createRouter, createWebHashHistory } from 'vue-router';
import defaultRoutes from './default';
import whiteLabelRoutes from './whiteLabel';

const { isWhiteLabel } = useWhiteLabel();

const router = createRouter({
  history: createWebHashHistory(),
  routes: isWhiteLabel.value ? whiteLabelRoutes : defaultRoutes,
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
