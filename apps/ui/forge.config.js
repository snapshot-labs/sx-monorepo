export default {
  packagerConfig: {
    appBundleId: 'box.snapshot.app',
    name: 'Snapshot',
    icon: './src/assets/icon',
    ignore: [
      /^\/src/,
      /^\/test/,
      /^\/tests/,
      /^\/storybook-static/,
      /^\/screenshots/,
      /\.md$/
    ],
    asar: false,
    out: 'out',
    overwrite: true,
    prune: false,
    derefSymlinks: false,
    packageManager: 'yarn'
  },

  rebuildConfig: {},
  plugins: [],
  makers: [
    {
      name: '@electron-forge/maker-dmg',
      platforms: ['darwin'],
      config: {
        icon: './src/assets/icon.icns',
        iconSize: 80
      }
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['win32']
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['linux']
    }
  ]
};
