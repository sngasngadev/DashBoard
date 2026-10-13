'use strict';
const fs=require('node:fs');
const path=require('node:path');
const Database=require('better-sqlite3');
const {openDashboardDatabase}=require('./database.cjs');

function validateBackup(file) {
  if(path.extname(file).toLowerCase()!=='.db')throw new Error('SQLite .db 백업 파일만 복원할 수 있습니다.');
  const db=new Database(file,{readonly:true,fileMustExist:true});
  try{
    const integrity=db.pragma('quick_check',{simple:true});
    if(integrity!=='ok')throw new Error('백업 파일의 무결성 검사에 실패했습니다.');
    const version=db.pragma('user_version',{simple:true});
    if(version<1||version>2)throw new Error('호환되지 않는 백업 버전입니다.');
    const table=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='dashboard_state'").get();
    if(!table)throw new Error('대시보드 데이터베이스가 아닙니다.');
    const row=db.prepare('SELECT payload FROM dashboard_state WHERE id=1').get();
    if(row){
      let state;
      try{state=JSON.parse(row.payload);}catch{throw new Error('백업 데이터가 손상되었습니다.');}
      if(state.version!==1||!Array.isArray(state.cards))throw new Error('잘못된 대시보드 데이터입니다.');
    }
    return true;
  } finally {db.close();}
}

async function restoreDatabase(current,root,backupFile){
  const target=path.join(root,'data','dashboard.db');
  if(path.resolve(backupFile)===path.resolve(target))throw new Error('사용 중인 데이터베이스를 백업으로 선택할 수 없습니다.');
  validateBackup(backupFile);
  const safety=await current.backup();
  current.close();
  try{
    fs.copyFileSync(backupFile,target);
    // Every backup created by SQLite backup() is a self-contained DB.
    for(const suffix of ['-wal','-shm'])fs.rmSync(target+suffix,{force:true});
    return openDashboardDatabase(root);
  }catch(error){
    try{
      fs.copyFileSync(safety,target);
      for(const suffix of ['-wal','-shm'])fs.rmSync(target+suffix,{force:true});
      const recovered=openDashboardDatabase(root);
      return {recovered,error};
    }catch(rollbackError){
      throw new Error('복구 실패, 안전 복사본 위치: '+safety+'; 오류: '+String(error)+'; 롤백 오류: '+String(rollbackError));
    }
  }
}
module.exports={validateBackup,restoreDatabase};
