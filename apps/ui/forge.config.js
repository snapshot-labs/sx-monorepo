export default {
  packagerConfig: {
    appBundleId: 'com.snapshot.app',
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
    asar: false, // Disable asar to fix Windows module resolution
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
      platforms: ['darwin']
    },
    // Windows: ZIP files (cross-platform compatible) - supports 64-bit
    {
      name: '@electron-forge/maker-zip',
      platforms: ['win32']
    },
    // Linux: ZIP packages (universal format)
    {
      name: '@electron-forge/maker-zip',
      platforms: ['linux']
    }
  ]
};
