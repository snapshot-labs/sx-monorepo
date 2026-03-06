import { Preview, Decorator, setup } from '@storybook/vue3-vite';
import { createRouter, createMemoryHistory } from 'vue-router';
import { withThemeByClassName } from '@storybook/addon-themes';
import { createTune } from '../src/plugin';
import '../src/styles/theme.scss';
import '../src/styles/tippy.scss';
import './style.css';
import { h } from 'vue';

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

  app.use(createTune());
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
