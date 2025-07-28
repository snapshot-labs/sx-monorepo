import { Preview, Decorator, setup } from '@storybook/vue3-vite';
import VueTippy from 'vue-tippy';
import { withThemeByClassName } from '@storybook/addon-themes';

import '../src/style.scss';
import './style.css';

setup(app => {
  app.use(VueTippy, {
    defaultProps: { appendTo: 'parent' }
  });
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
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'todo'
    }
  }
};

export default preview;
