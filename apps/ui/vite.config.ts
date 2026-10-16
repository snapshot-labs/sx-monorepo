import { createRequire } from 'module';
import path from 'path';
import { TuneResolver } from '@snapshot-labs/tune/resolver';
import vue from '@vitejs/plugin-vue';
import { visualizer } from 'rollup-plugin-visualizer';
import AutoImport from 'unplugin-auto-import/vite';
import { FileSystemIconLoader } from 'unplugin-icons/loaders';
import IconsResolver from 'unplugin-icons/resolver';
import Icons from 'unplugin-icons/vite';
import Components from 'unplugin-vue-components/vite';
import { defineConfig } from 'vite';

const require = createRequire(import.meta.url);

const ELECTRON = process.env.ELECTRON || false;

/**
 * Applied under Vitest only, never to the app bundle.
 *
 * The crypto package ships the same code as CommonJS and as an ES module. The
 * ESM build loads its emscripten BLST binary through a dynamic `require('fs')`:
 * unreachable in a browser, fine in CommonJS, and a hard failure under Node's
 * ESM loader — which is exactly where Vitest runs these tests.
 */
const TEST_ONLY_ALIASES: Record<string, string> = process.env.VITEST
  ? {
      '@shutter-network/urban-verified-crypto': require.resolve(
        '@shutter-network/urban-verified-crypto'
      )
    }
  : {};

export default defineConfig({
  base: ELECTRON ? './' : undefined,
  define: {
    'process.env': process.env
  },
  plugins: [
    vue(),
    AutoImport({
      imports: ['vue', 'vue-router', '@vueuse/core'],
      dirs: ['./src/composables', './src/stores'],
      eslintrc: {
        enabled: true
      }
    }),
    Components({
      directoryAsNamespace: true,
      resolvers: [
        TuneResolver(),
        IconsResolver({
          customCollections: ['c'],
          alias: {
            h: 'heroicons-outline',
            s: 'heroicons-solid'
          }
        })
      ]
    }),
    visualizer({
      filename: './dist/stats.html',
      template: 'sunburst',
      gzipSize: true
    }),
    Icons({
      compiler: 'vue3',
      iconCustomizer(collection, icon, props) {
        props.width = '20px';
        props.height = '20px';
      },
      customCollections: {
        c: FileSystemIconLoader('./src/assets/icons', svg =>
          svg.replace(/^<svg /, '<svg fill="currentColor" ')
        )
      }
    })
  ],
  optimizeDeps: {
    exclude: ['@snapshot-labs/sx']
  },
  build: {
    target: 'esnext',
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true
    },
    rolldownOptions: {
      transform: {
        inject: {
          Buffer: ['buffer', 'Buffer']
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      ...TEST_ONLY_ALIASES,
      // polyfills
      stream: require.resolve('stream-browserify'),
      events: require.resolve('events'),
      util: require.resolve('util'),
      buffer: require.resolve('buffer')
    },
    dedupe: ['@popperjs/core']
  }
});
