const { app, BrowserWindow, shell } = require('electron');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 400,
    minHeight: 500,
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

  // Allow only WalletConnect and Argent Mobile, open in default browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    const allowedHosts = [
      'sequence.app',
      'keys.coinbase.com',
      'web.argent.xyz'
    ];
    const isAllowedToOpenInElectron = allowedHosts.some(host =>
      url.includes(host)
    );

    if (
      !isAllowedToOpenInElectron &&
      (url.startsWith('http:') || url.startsWith('https:'))
    ) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
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
