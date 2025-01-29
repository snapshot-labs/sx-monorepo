import { createRouter, createWebHashHistory } from 'vue-router';
import SplashScreen from '@/components/Layout/SplashScreen.vue';
import aliases from '@/helpers/aliases.json';
import { metadataNetwork } from '@/networks';
import defaultRoutes from '@/routes/default';

const { resolved, isWhiteLabel } = useWhiteLabel();

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
  if (isWhiteLabel.value) return next();

  const [, space, ...rest] = to.path.split('/');
  let spaceName = space.replace(`${metadataNetwork}:`, '');
  // skip if network is not metadataNetwork or is whitelabel
  if (spaceName.includes(':')) return next();

  let redirectPath: string | null = null;

  // Redirect paths like "/safe.eth/settings" to "/s:safe.eth/settings"
  if (to.matched[0]?.name === 'space') {
    // if space has alias, change url to it
    spaceName = aliases[spaceName] || spaceName;
    const restPath = rest.length ? `/${rest.join('/')}` : '';
    redirectPath = `/${metadataNetwork}:${spaceName}${restPath}`;
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
  if (redirectPath && redirectPath !== to.path) {
    next({ path: redirectPath, replace: true });
  } else {
    next();
  }
});

export default router;
