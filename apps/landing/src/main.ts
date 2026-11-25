import './style.css';
import { createApp } from 'vue';
import Landing from './Landing.vue';
import { nameOf } from './timeline';

// /#/terms and /#/privacy load their page and its text on their own. The
// landing and the legal pages each set up for good, so moving between them
// loads the site again, while the landing's own anchors move between slides.
const legalPage = () => {
  const name = nameOf(location.hash);
  return name === 'terms' || name === 'privacy' ? name : '';
};
const page = legalPage();
if (page) {
  import('./Legal.vue').then(({ default: Legal }) =>
    createApp(Legal, { page }).mount('#app')
  );
} else {
  createApp(Landing).mount('#app');
}
addEventListener('hashchange', () => {
  if (legalPage() === page) return;
  // The new page decides where it opens, not the old scroll position.
  history.scrollRestoration = 'manual';
  location.reload();
});
