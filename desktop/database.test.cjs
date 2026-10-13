'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {openDashboardDatabase} = require('./database.cjs');

test('SQLite lifecycle: state, notes, trash, attachment, backup and reopening', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(),'dashboard-test-'));
  let db;
  try {
    db = openDashboardDatabase(root);
    const payload = {version:1,meta:{title:'Dashboard'},cards:[],settings:{}};
    assert.equal(db.loadState(),null);
    assert.equal(db.saveState(payload),true);
    assert.deepEqual(db.loadState(),payload);
    const createdAt = new Date().toISOString();
    db.upsertNote({id:'memo1',cardId:'group1',title:'회의 기록',plainText:'다음 주 계약 검토',sortOrder:0,createdAt,document:{type:'doc',content:[]}});
    db.upsertNote({id:'memo2',cardId:'group1',title:'두 번째',plainText:'개발 자료',sortOrder:1,createdAt});
    assert.equal(db.listNotes('group1').length,2);
    assert.equal(db.searchNotes('group1','계약','body').length,1);
    assert.equal(db.searchNotes('other','계약','body').length,0);
    assert.equal(db.getNote('memo1').title,'회의 기록');
    assert.equal(db.saveAttachment('image1','image/png',[137,80,78,71]),true);
    assert.deepEqual(db.getAttachment('image1').bytes,[137,80,78,71]);
    assert.equal(db.trashNote('memo1','업무 메모'),true);
    assert.equal(db.listNotes('group1').length,1);
    assert.equal(db.listTrash()[0].originalCardTitle,'업무 메모');
    assert.equal(db.restoreNotes([{id:'memo1'}]),1);
    assert.equal(db.listNotes('group1')[1].id,'memo1');
    db.trashNote('memo1','업무 메모');
    assert.equal(db.permanentlyDeleteNotes(['memo1']),1);
    assert.equal(db.listTrash().length,0);
    const backedUp=await db.backup();
    assert.ok(fs.existsSync(backedUp));
    db.close();db=null;
    db=openDashboardDatabase(root);
    assert.deepEqual(db.loadState(),payload);
    assert.equal(db.listNotes('group1').length,1);
  } finally {
    if (db) db.close();
    fs.rmSync(root,{recursive:true,force:true});
  }
});

test('Reject newer DB schemas without rewriting user files', () => {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'dashboard-schema-test-'));
  try {
    const Database=require('better-sqlite3');
    const data=path.join(root,'data');
    fs.mkdirSync(data,{recursive:true});
    const db=new Database(path.join(data,'dashboard.db'));
    db.pragma('user_version = 999');
    db.close();
    assert.throws(()=>openDashboardDatabase(root),/새로운 버전/);
  } finally {fs.rmSync(root,{recursive:true,force:true});}
});
