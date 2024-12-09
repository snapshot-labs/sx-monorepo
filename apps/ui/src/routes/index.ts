import { createRouter, createWebHashHistory } from 'vue-router';
import SplashScreen from '@/components/Layout/SplashScreen.vue';
import { metadataNetwork } from '@/networks';
import defaultRoutes from '@/routes/default';

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

// Add a global navigation guard for URL redirection
router.beforeEach((to, _from, next) => {
  let redirectPath: string | null = null;

  // Match and redirect paths like "/safe.eth/settings" to "/s:safe.eth/settings"
  const domainMatch = to.path.match(/^\/([^:\/]+?\.[^:\/]+)(\/.*)?$/);
  if (domainMatch) {
    const domain = domainMatch[1];
    const rest = domainMatch[2] || '';
    redirectPath = `/${metadataNetwork}:${domain}`;
    if (rest && !/^\/about$/.test(rest)) {
      redirectPath += rest;
    }
  }

  // Match and redirect paths like "/delegate/safe.eth" to "/s:safe.eth/delegates"
  const delegateMatch = to.path.match(/^\/delegate\/([^:\/]+?\.[^:\/]+)$/);
  if (delegateMatch) {
    const domain = delegateMatch[1];
    redirectPath = `/${metadataNetwork}:${domain}/delegates`;
  }

  // Match and redirect "/strategy/*" or "/playground/*" to v1.snapshot.box
  if (to.path.startsWith('/strategy/') || to.path.startsWith('/playground/')) {
    const newPath = to.path.replace(/^\/(strategy|playground)/, '/#$1');
    window.location.href = `https://v1.snapshot.box${newPath}`;
    return;
  }

  // Perform the redirection if a match is found
  if (redirectPath) {
    next({ path: redirectPath, replace: true });
  } else {
    next();
  }
});

export default router;
