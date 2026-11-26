import type { Component, InjectionKey, Plugin } from 'vue';

export interface TuneOptions {
  /**
   * URL of an endpoint that returns `{ title?, description?, icon? }` for a `?url=` query parameter.
   * Used by `<UiLinkPreview>`. When unset, the component renders only the default fallback.
   */
  linkPreviewUrl?: string;
  /**
   * The app's link component, rendered by `<UiDropdownItem>` with its `to` attribute.
   * Defaults to a `<button>`.
   */
  linkComponent?: Component;
}

export const TUNE_OPTIONS_KEY: InjectionKey<TuneOptions> = Symbol('tune');

export function createTune(options: TuneOptions = {}): Plugin {
  return {
    install(app) {
      app.provide(TUNE_OPTIONS_KEY, options);
    }
  };
}
