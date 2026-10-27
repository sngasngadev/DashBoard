'use strict';
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const diagnosticFile=path.join(os.tmpdir(),'DashBoard-diagnostic.log');
function diagnose(message,detail=''){
  try{fs.appendFileSync(diagnosticFile,new Date().toISOString()+' '+message+' '+String(detail)+'\n');}catch{}
}
diagnose('Starting DashBoard, pid='+process.pid+', platform='+process.platform);
process.on('uncaughtException',error=>diagnose('uncaughtException',error?.stack||error));
process.on('unhandledRejection',error=>diagnose('unhandledRejection',error?.stack||error));

const { app, BrowserWindow, ipcMain, crashReporter } = require('electron');
const minimalMode=process.argv.includes('--dashboard-minimal');
diagnose('Diagnostic mode',minimalMode?'minimal':'normal');
try {
  crashReporter.start({submitURL:'',uploadToServer:false,compress:false});
  diagnose('Crash reporter started',app.getPath('crashDumps'));
} catch(error) {diagnose('Crash reporter initialization failed',error?.stack||error);}

const { openDashboardDatabase } = require('./database.cjs');
const { restoreDatabase } = require('./restore.cjs');

// All user-managed data stays next to the packaged executable directory.
const root = app.isPackaged ? path.dirname(process.execPath) : path.resolve(__dirname,'..');
let storage;
let window;
let restoring=false;

function registerHandlers() {
  const handlers = {
    'dashboard:load':()=>storage.loadState(),
    'dashboard:save':(_e,state)=>restoring?false:storage.saveState(state),
    'dashboard:backup':()=>storage.backup(),
    'dashboard:restore':async()=>{
      const {dialog}=require('electron');
      const {canceled,filePaths}=await dialog.showOpenDialog(window,{title:'SQLite 백업 복원',defaultPath:path.join(root,'backups'),properties:['openFile'],filters:[{name:'SQLite 백업',extensions:['db']}]});
      if(canceled||!filePaths[0])return false;
      const decision=await dialog.showMessageBox(window,{type:'warning',buttons:['취소','복원'],defaultId:0,cancelId:0,title:'백업 복원',message:'현재 대시보드 데이터를 선택한 백업으로 교체할까요?',detail:'현재 데이터는 별도 안전 백업으로 보관합니다.'});
      if(decision.response!==1)return false;
      restoring=true;
      try {
        const outcome=await restoreDatabase(storage,root,filePaths[0]);
        if('recovered' in outcome){storage=outcome.recovered;throw outcome.error;}
        storage=outcome;
        window.webContents.once('did-finish-load',()=>{restoring=false;});
        window.webContents.reload();
        return true;
      } catch(error) {restoring=false;throw error;}
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

app.on('child-process-gone',(_event,details)=>diagnose('child-process-gone',JSON.stringify(details)));
app.whenReady().then(()=>{
  diagnose('Electron ready, root=',root);
  if(minimalMode) {
    diagnose('Creating minimal BrowserWindow');
    window=new BrowserWindow({width:650,height:350,webPreferences:{sandbox:false,nodeIntegration:false,contextIsolation:true}});
    diagnose('Minimal BrowserWindow created');
    window.webContents.on('render-process-gone',(_event,details)=>diagnose('minimal render-process-gone',JSON.stringify(details)));
    window.webContents.on('did-fail-load',(_event,code,description)=>diagnose('minimal did-fail-load',code+' '+description));
    window.webContents.on('did-finish-load',()=>diagnose('Minimal renderer loaded'));
    diagnose('Before minimal loadURL');
    window.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent('<!doctype html><html lang="ko"><meta charset="utf-8"><title>DashBoard 진단</title><body style="font:18px sans-serif;padding:30px"><h2>DashBoard 최소 창 테스트 성공</h2><p>이 창이 유지되면 Electron 기본 창 실행은 가능합니다.</p></body></html>')).then(()=>diagnose('Minimal loadURL resolved')).catch(e=>diagnose('Minimal loadURL failed',e?.stack||e));
    diagnose('After minimal loadURL');
    return;
  }
  try {
    diagnose('Opening SQLite database');
    storage = openDashboardDatabase(root);
    diagnose('SQLite ready');
  } catch (err) {
    const { dialog } = require('electron');
    dialog.showErrorBox('대시보드 데이터 오류',String(err.message||err));
    app.quit();
    return;
  }
  registerHandlers();
  diagnose('IPC handlers ready');
  void storage.backupIfDue().catch(error=>console.error('Automatic backup failed:',error));
  setInterval(()=>{if(storage)void storage.backupIfDue().catch(error=>console.error('Automatic backup failed:',error));},60*60*1000);
  window = new BrowserWindow({
    width:1280,height:850,minWidth:800,minHeight:600,
    webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:false}
  });
  diagnose('BrowserWindow created');
  window.webContents.on('render-process-gone',(_event,details)=>diagnose('render-process-gone',JSON.stringify(details)));
  window.webContents.on('did-fail-load',(_event,code,description,url)=>diagnose('did-fail-load',JSON.stringify({code,description,url})));
  window.webContents.on('console-message',(_event,details)=>{if(details.level==='error')diagnose('renderer console error',details.message);});
  window.on('unresponsive',()=>diagnose('BrowserWindow unresponsive'));
  window.on('closed',()=>diagnose('BrowserWindow closed'));
  window.webContents.on('did-finish-load',()=>diagnose('Renderer loaded'));
  diagnose('Before renderer loadFile');
  window.loadFile(path.join(__dirname,'renderer','index.html')).then(()=>diagnose('Renderer loadFile resolved')).catch(error=>diagnose('loadFile rejected',error?.stack||error));
  diagnose('After renderer loadFile');
  window.webContents.setWindowOpenHandler(() => ({ action:'deny' }));
});
app.on('window-all-closed',()=>app.quit());
app.on('before-quit',()=>{ diagnose('App before-quit'); if(storage){storage.close();storage=null;} });
