const path = require('path');
const { app, BrowserWindow, protocol, dialog } = require('electron');
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
