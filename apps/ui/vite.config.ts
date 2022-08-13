import path from 'path';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import GlobalPolyFill from '@esbuild-plugins/node-globals-polyfill';
import Components from 'unplugin-vue-components/vite';
import Icons from 'unplugin-icons/vite';
import IconsResolver from 'unplugin-icons/resolver';
import visualizer from 'rollup-plugin-visualizer';
import rollupNodePolyFill from 'rollup-plugin-node-polyfills';

const ELECTRON = process.env.ELECTRON || false;

export default defineConfig({
  base: ELECTRON ? path.resolve(__dirname, './dist') : undefined,
  define: {
    'process.env': process.env
  },
  plugins: [
    vue({ reactivityTransform: true }),
    Components({
      directoryAsNamespace: true,
      resolvers: [
        IconsResolver({
          alias: {
            h: 'heroicons-outline'
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
      }
    })
  ],
  optimizeDeps: {
    esbuildOptions: {
      plugins: [
        GlobalPolyFill({
          buffer: true
        })
      ]
    }
  },
  build: {
    rollupOptions: {
      plugins: [
        // @ts-ignore
        rollupNodePolyFill()
      ]
    }
  },
  resolve: {
    alias: {
      stream: 'rollup-plugin-node-polyfills/polyfills/stream',
      '@': path.resolve(__dirname, './src')
    },
    dedupe: ['@popperjs/core']
  }
});
