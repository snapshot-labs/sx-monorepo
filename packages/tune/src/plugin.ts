import { Component, Plugin } from 'vue';
import VueTippy from 'vue-tippy';

export interface TuneOptions {
  linkComponent?: Component;
}

export function createTune(options: TuneOptions = {}): Plugin {
  return {
    install(app) {
      if (options.linkComponent) {
        app.component('TuneLink', options.linkComponent);
      }

      app.use(VueTippy, {
        defaultProps: {
          delay: [0, null],
          theme: 'sx',
          animation: false
        }
      });
    }
  };
}
