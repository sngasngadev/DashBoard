'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {openDashboardDatabase}=require('./database.cjs');
const {validateBackup,restoreDatabase}=require('./restore.cjs');

test('Restore SQLite backup and preserve previous data as safety backup',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'dashboard-restore-'));
  let db=openDashboardDatabase(root);
  try{
    const old={version:1,cards:[],meta:{title:'이전 내용'},settings:{}};
    const current={version:1,cards:[],meta:{title:'새로운 내용'},settings:{}};
    db.saveState(old);
    const backup=await db.backup();
    assert.equal(validateBackup(backup),true);
    db.saveState(current);
    const next=await restoreDatabase(db,root,backup);
    assert.ok(!('recovered' in next),'restore failed');
    db=next;
    assert.deepEqual(db.loadState(),old);
    const backups=fs.readdirSync(path.join(root,'backups')).filter(name=>name.endsWith('.db'));
    assert.ok(backups.length>=2,'pre-restore backup missing');
  } finally{db.close();fs.rmSync(root,{recursive:true,force:true});}
});

test('Reject invalid restore source without closing current database',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'dashboard-restore-invalid-'));
  const db=openDashboardDatabase(root);
  try{
    const state={version:1,cards:[],meta:{title:'살아있는 데이터'},settings:{}};
    db.saveState(state);
    const invalid=path.join(root,'invalid.db');
    fs.writeFileSync(invalid,'not SQLite');
    await assert.rejects(()=>restoreDatabase(db,root,invalid));
    assert.deepEqual(db.loadState(),state);
  } finally{db.close();fs.rmSync(root,{recursive:true,force:true});}
});
