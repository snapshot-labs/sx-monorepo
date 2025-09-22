const { app, BrowserWindow } = require('electron');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    show: false,
    titleBarStyle: process.platform === 'darwin' ? 'hidden' : 'default',
    frame: false
  });

  const isDev = !app.isPackaged;

  if (isDev) {
    win.loadURL('http://localhost:8080');
  } else {
    win.loadFile('dist/index.html');
  }

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
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
