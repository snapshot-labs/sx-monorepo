import { Plugin } from 'vue';
import VueTippy from 'vue-tippy';

export function createTune(): Plugin {
  return {
    install(app) {
      app.use(VueTippy, {
        defaultProps: {
          delay: [0, null],
          animation: false
        }
      });
    }
  };
}
