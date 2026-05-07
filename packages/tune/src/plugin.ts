import type { InjectionKey, Plugin } from 'vue';
import VueTippy from 'vue-tippy';

export interface TuneOptions {
  /**
   * URL of an endpoint that returns `{ title?, description?, icon? }` for a `?url=` query parameter.
   * Used by `<UiLinkPreview>`. When unset, the component renders only the default fallback.
   */
  linkPreviewUrl?: string;
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
