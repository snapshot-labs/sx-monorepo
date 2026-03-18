import { resolve } from 'path';
import vue from '@vitejs/plugin-vue';
import AutoImport from 'unplugin-auto-import/vite';
import { FileSystemIconLoader } from 'unplugin-icons/loaders';
import IconsResolver from 'unplugin-icons/resolver';
import Icons from 'unplugin-icons/vite';
import Components from 'unplugin-vue-components/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    vue(),
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
    AutoImport({
      imports: ['vue', '@vueuse/core'],
      eslintrc: {
        enabled: true,
        filepath: resolve(__dirname, '.eslintrc-auto-import.json')
      }
    }),
    Icons({
      compiler: 'vue3',
      iconCustomizer(_collection, _icon, props) {
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
  build: {
    lib: {
      entry: {
        index: 'src/index.ts',
        resolver: 'src/resolver.ts'
      },
      formats: ['es']
    },
    cssCodeSplit: true,
    rolldownOptions: {
      external: ['vue', 'vue-router', '@vueuse/core', 'unplugin-vue-components']
    }
  }
});
