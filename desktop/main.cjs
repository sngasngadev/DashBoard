'use strict';
const path = require('node:path');
const { app, BrowserWindow, ipcMain } = require('electron');
const { openDashboardDatabase } = require('./database.cjs');

// All user-managed data stays next to the packaged executable directory.
const root = app.isPackaged ? path.dirname(process.execPath) : path.resolve(__dirname,'..');
let storage;
let window;

function registerHandlers() {
  const handlers = {
    'dashboard:load':()=>storage.loadState(),
    'dashboard:save':(_e,state)=>storage.saveState(state),
    'dashboard:backup':()=>storage.backup(),
    'notes:list':(_e,id)=>storage.listNotes(id),
    'notes:get':(_e,id)=>storage.getNote(id),
    'notes:save':(_e,note)=>storage.upsertNote(note),
    'notes:search':(_e,id,q,field)=>storage.searchNotes(id,q,field),
    'notes:trash':(_e,id,title)=>storage.trashNote(id,title),
    'notes:trash-list':()=>storage.listTrash(),
    'notes:restore':(_e,items)=>storage.restoreNotes(items),
    'notes:delete':(_e,ids)=>storage.permanentlyDeleteNotes(ids),
    'attachments:save':(_e,id,mime,bytes)=>storage.saveAttachment(id,mime,bytes),
    'attachments:get':(_e,id)=>storage.getAttachment(id)
  };
  for (const [channel, handler] of Object.entries(handlers)) ipcMain.handle(channel,handler);
}

app.whenReady().then(()=>{
  try {
    storage = openDashboardDatabase(root);
  } catch (err) {
    const { dialog } = require('electron');
    dialog.showErrorBox('대시보드 데이터 오류',String(err.message||err));
    app.quit();
    return;
  }
  registerHandlers();
  window = new BrowserWindow({
    width:1280,height:850,minWidth:800,minHeight:600,
    webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:false}
  });
  window.loadFile(path.join(__dirname,'renderer','index.html'));
  window.webContents.setWindowOpenHandler(() => ({ action:'deny' }));
});
app.on('window-all-closed',()=>app.quit());
app.on('before-quit',()=>{ if(storage){storage.close();storage=null;} });
