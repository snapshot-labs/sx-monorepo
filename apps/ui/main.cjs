
const path = require('path');
const { app, BrowserWindow, protocol, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const fs = require('fs');


function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
    show: false, // Don't show until ready
    titleBarStyle: 'default',
  });

  const indexPath = path.join(__dirname, 'dist', 'index.html');

  let buildFile;
  if (fs.existsSync(indexPath)) {
    buildFile = indexPath;
  } else {
    console.error('Build files not found! Please run "yarn build:electron" first.');
    app.quit();
    return;
  }

  win.loadFile(buildFile);

  win.once('ready-to-show', () => {
    win.show();

    // Check for updates after the window is shown
    if (!app.isPackaged) {
      console.log('App is not packaged, skipping auto-updater');
    } else {
      autoUpdater.checkForUpdatesAndNotify();
    }
  });
}


app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});


app.on('window-all-closed', () => {
  app.quit();
});

// Auto-updater event listeners
autoUpdater.on('checking-for-update', () => {
  console.log('Checking for update...');
});

autoUpdater.on('update-available', (info) => {
  console.log('Update available:', info);
});

autoUpdater.on('update-not-available', (info) => {
  console.log('Update not available:', info);
});

autoUpdater.on('error', (err) => {
  console.error('Error in auto-updater:', err);
});

autoUpdater.on('download-progress', (progressObj) => {
  let log_message = `Download speed: ${progressObj.bytesPerSecond}`;
  log_message = log_message + ` - Downloaded ${progressObj.percent}%`;
  log_message = log_message + ` (${progressObj.transferred}/${progressObj.total})`;
  console.log(log_message);
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('Update downloaded:', info);
  autoUpdater.quitAndInstall();
});
