import { InjectionKey, Plugin } from 'vue';
import VueTippy from 'vue-tippy';

export interface TuneOptions {
  iframelyApiKey?: string;
}

export const TUNE_OPTIONS_KEY: InjectionKey<TuneOptions> = Symbol('tune');

export function createTune(options: TuneOptions = {}): Plugin {
  return {
    install(app) {
      app.provide(TUNE_OPTIONS_KEY, options);

      app.use(VueTippy, {
        defaultProps: {
          delay: [0, null],
          animation: false
        }
      });
    }
  };
}
