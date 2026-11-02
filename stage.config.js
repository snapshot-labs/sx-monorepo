import { defineConfig } from '@stage-labs/config';

export default defineConfig({
  workspaces: {
    'apps/api': { type: 'library' },
    'apps/delegates-api': { type: 'library' },
    'apps/hub': { type: 'library' },
    'apps/mana': { type: 'library' },
    'apps/mcp': { type: 'library' },
    'apps/sequencer': { type: 'library' },
    'packages/lock': { type: 'library' },
    'packages/sx.js': { type: 'library' }
  }
});
