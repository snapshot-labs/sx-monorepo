import './style.css';
import { createApp } from 'vue';
import Landing from './Landing.vue';

// /terms and /privacy load their page and its text on their own.
const page = location.pathname.replace(/^\/|\/$/g, '');
if (page === 'terms' || page === 'privacy') {
  import('./Legal.vue').then(({ default: Legal }) =>
    createApp(Legal, { page }).mount('#app')
  );
} else {
  createApp(Landing).mount('#app');
}
