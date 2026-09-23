const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 1024,
    minHeight: 700,
    title: 'College Bus Tracking & Fleet Command Center',
    backgroundColor: '#0b1329',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  Menu.setApplicationMenu(null);

  // In production, load the built dist/index.html
  const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
  win.loadFile(indexPath).catch(() => {
    win.loadURL('http://localhost:5173');
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
