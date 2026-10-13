'use strict';
const path = require('node:path');
const { app, BrowserWindow, ipcMain } = require('electron');
const { openDashboardDatabase } = require('./database.cjs');
const { restoreDatabase } = require('./restore.cjs');

// All user-managed data stays next to the packaged executable directory.
const root = app.isPackaged ? path.dirname(process.execPath) : path.resolve(__dirname,'..');
let storage;
let window;

function registerHandlers() {
  const handlers = {
    'dashboard:load':()=>storage.loadState(),
    'dashboard:save':(_e,state)=>storage.saveState(state),
    'dashboard:backup':()=>storage.backup(),
    'dashboard:restore':async()=>{
      const {dialog}=require('electron');
      const {canceled,filePaths}=await dialog.showOpenDialog(window,{title:'SQLite 백업 복원',defaultPath:path.join(root,'backups'),properties:['openFile'],filters:[{name:'SQLite 백업',extensions:['db']}]});
      if(canceled||!filePaths[0])return false;
      const decision=await dialog.showMessageBox(window,{type:'warning',buttons:['취소','복원'],defaultId:0,cancelId:0,title:'백업 복원',message:'현재 대시보드 데이터를 선택한 백업으로 교체할까요?',detail:'현재 데이터는 별도 안전 백업으로 보관합니다.'});
      if(decision.response!==1)return false;
      const outcome=await restoreDatabase(storage,root,filePaths[0]);
      if('recovered' in outcome){storage=outcome.recovered;throw outcome.error;}
      storage=outcome;
      window.webContents.reload();
      return true;
    },
    'notes:list':(_e,id)=>storage.listNotes(id),
    'notes:reorder':(_e,id,ids)=>storage.reorderNotes(id,ids),
    'notes:get':(_e,id)=>storage.getNote(id),
    'notes:save':(_e,note)=>storage.upsertNote(note),
    'notes:search':(_e,id,q,field)=>storage.searchNotes(id,q,field),
    'notes:trash':(_e,id,title)=>storage.trashNote(id,title),
    'notes:trash-list':()=>storage.listTrash(),
    'notes:trash-card':(_e,id,title)=>storage.trashCardNotes(id,title),
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
  void storage.backupIfDue().catch(error=>console.error('Automatic backup failed:',error));
  setInterval(()=>{if(storage)void storage.backupIfDue().catch(error=>console.error('Automatic backup failed:',error));},60*60*1000);
  window = new BrowserWindow({
    width:1280,height:850,minWidth:800,minHeight:600,
    webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:false}
  });
  window.loadFile(path.join(__dirname,'renderer','index.html'));
  window.webContents.setWindowOpenHandler(() => ({ action:'deny' }));
});
app.on('window-all-closed',()=>app.quit());
app.on('before-quit',()=>{ if(storage){storage.close();storage=null;} });
