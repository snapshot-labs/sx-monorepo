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
      // polyfills
      stream: require.resolve('stream-browserify'),
      events: require.resolve('events'),
      util: require.resolve('util'),
      buffer: require.resolve('buffer')
    },
    dedupe: ['@popperjs/core']
  }
});
