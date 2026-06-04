import { createRouter, createWebHashHistory } from 'vue-router';
import auctionRoutes from '@/routes/auction';

const router = createRouter({
  history: createWebHashHistory(),
  routes: auctionRoutes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition;
    if (to.params.retainScrollPosition) return {};
    if (to.hash) {
      return { el: to.hash, behavior: 'smooth' };
    }
    return { top: 0 };
  }
});

export default router;
