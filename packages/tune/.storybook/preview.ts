import { withThemeByClassName } from '@storybook/addon-themes';
import { type Decorator, type Preview, setup } from '@storybook/vue3-vite';
import { h } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import { createTune } from '../src/plugin';
import '../src/styles/index.scss';
import './style.css';

setup(app => {
  app.use(
    createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: '/:pathMatch(.*)?',
          name: 'home',
          component: async () => h('div')
        }
      ]
    })
  );

  app.use(createTune({ iframelyApiKey: 'd155718c86be7d5305ccb6' }));
});

export const decorators: Decorator[] = [
  withThemeByClassName({
    themes: {
      light: 'light',
      dark: 'dark'
    },
    defaultTheme: 'light'
  })
];

const preview: Preview = {
  parameters: {
    backgrounds: {
      options: {
        dark: { name: 'dark', value: 'rgb(24, 23, 28)' },
        light: { name: 'light', value: '#ffffff' }
      }
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i
      }
    },
    a11y: {
      test: 'todo'
    }
  }
};

export default preview;
