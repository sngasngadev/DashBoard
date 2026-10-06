const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const fs = require('fs/promises');
const fsSync = require('fs');
const path = require('path');

const isDev = !app.isPackaged;

function portableDirectory() {
  if (isDev) return path.resolve(__dirname, '..');
  if (process.env.PORTABLE_EXECUTABLE_DIR) return process.env.PORTABLE_EXECUTABLE_DIR;
  return path.dirname(process.execPath);
}

function dataPath() {
  return path.join(portableDirectory(), 'dashboard-data.json');
}

async function atomicWrite(target, text) {
  const temp = `${target}.tmp`;
  const backup = target.replace(/\.json$/i, '.backup.json');
  if (fsSync.existsSync(target)) {
    await fs.copyFile(target, backup).catch(() => undefined);
  }
  await fs.writeFile(temp, text, 'utf8');
  await fs.rename(temp, target);
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#f2f4f7',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (isDev) win.loadURL('http://127.0.0.1:5173');
  else win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

ipcMain.handle('storage:load', async () => {
  try {
    return JSON.parse(await fs.readFile(dataPath(), 'utf8'));
  } catch (error) {
    if (error && error.code === 'ENOENT') return null;
    throw error;
  }
});

ipcMain.handle('storage:save', async (_event, value) => {
  await atomicWrite(dataPath(), JSON.stringify(value, null, 2));
  return true;
});

ipcMain.handle('storage:location', () => dataPath());

ipcMain.handle('storage:export', async (_event, value) => {
  const result = await dialog.showSaveDialog({
    title: '대시보드 백업 저장',
    defaultPath: `DashBoard-backup-${new Date().toISOString().slice(0, 10)}.json`,
    filters: [{ name: 'DashBoard Backup', extensions: ['json'] }]
  });
  if (result.canceled || !result.filePath) return false;
  await fs.writeFile(result.filePath, JSON.stringify(value, null, 2), 'utf8');
  return true;
});

ipcMain.handle('storage:import', async () => {
  const result = await dialog.showOpenDialog({
    title: '대시보드 백업 불러오기',
    properties: ['openFile'],
    filters: [{ name: 'DashBoard Backup', extensions: ['json'] }]
  });
  if (result.canceled || !result.filePaths[0]) return null;
  return JSON.parse(await fs.readFile(result.filePaths[0], 'utf8'));
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
