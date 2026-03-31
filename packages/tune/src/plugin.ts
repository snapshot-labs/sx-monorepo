import type { InjectionKey, Plugin } from 'vue';
import VueTippy from 'vue-tippy';
import type { Router } from 'vue-router';

export interface TuneOptions {
  useRouter?: () => Router;
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
