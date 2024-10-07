import path from 'path';
import inject from '@rollup/plugin-inject';
import vue from '@vitejs/plugin-vue';
import visualizer from 'rollup-plugin-visualizer';
import AutoImport from 'unplugin-auto-import/vite';
import { FileSystemIconLoader } from 'unplugin-icons/loaders';
import IconsResolver from 'unplugin-icons/resolver';
import Icons from 'unplugin-icons/vite';
import Components from 'unplugin-vue-components/vite';
import { defineConfig } from 'vite';

const ELECTRON = process.env.ELECTRON || false;

const target = ['esnext'];

export default defineConfig({
  base: ELECTRON ? path.resolve(__dirname, './dist') : undefined,
  server: {
    host: '127.0.0.1'
  },
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
    exclude: ['@snapshot-labs/sx'],
    esbuildOptions: {
      target
    }
  },
  build: {
    target,
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true
    },
    rollupOptions: {
      plugins: [
        inject({
          Buffer: ['buffer', 'Buffer']
        })
      ]
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // polyfills
      stream: path.resolve('../../node_modules/stream-browserify'),
      events: path.resolve('../../node_modules/events'),
      util: path.resolve('../../node_modules/util'),
      buffer: path.resolve('../../node_modules/buffer')
    },
    dedupe: ['@popperjs/core']
  }
});
