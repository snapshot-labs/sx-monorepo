declare module 'highlightjs-solidity' {
  import { LanguageFn } from 'lowlight';

  export const solidity: LanguageFn;
}

declare module 'highlight.js/lib/core' {
  import { LanguageFn } from 'lowlight';

  const hljs: {
    registerLanguage(name: string, language: LanguageFn): void;
    getLanguage(name: string): unknown;
    highlight(code: string, options: { language: string }): { value: string };
    highlightAuto(code: string): { value: string };
  };

  export default hljs;
}
