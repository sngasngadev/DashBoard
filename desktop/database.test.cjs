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


test('Notes reorder without truncating search content', () => {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'dashboard-order-'));
  const db=openDashboardDatabase(root);
  try {
    for(const [id,order,text] of [['one',0,'처음부터 끝까지 보존되어야 하는 본문 검색 문자열'],['two',1,'두 번째 항목']]){
      db.upsertNote({id,cardId:'group',title:id,plainText:text,sortOrder:order,document:{html:'<p>'+text+'</p>'}});
    }
    assert.equal(db.reorderNotes('group',['two','one']),true);
    assert.deepEqual(db.listNotes('group').map(note=>note.id),['two','one']);
    assert.equal(db.searchNotes('group','보존','body')[0].id,'one');
    assert.throws(()=>db.reorderNotes('group',['one']),/변경/);
  } finally {db.close();fs.rmSync(root,{recursive:true,force:true});}
});

test('Free memo attachment references survive note deletion and SQLite upgrades', () => {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'dashboard-attachments-'));
  let db=openDashboardDatabase(root);
  try {
    assert.equal(db.saveAttachment('pic','image/png',[137,80,78,71]),true);
    const html='<p>사진</p><img data-attachment-id="pic" src="attachment://pic" />';
    const state={version:1,meta:{title:'검증'},settings:{},cards:[
      {id:'card1',type:'memo',data:{html},title:'자유메모',layout:{x:0,y:0,w:4,h:4}}
    ]};
    assert.equal(db.saveState(state),true);
    db.upsertNote({id:'note1',cardId:'group',title:'첨부',plainText:'본문',document:{html}});
    assert.equal(db.trashNote('note1','업무'),true);
    assert.equal(db.permanentlyDeleteNotes(['note1']),1);
    assert.deepEqual(db.getAttachment('pic').bytes,[137,80,78,71]);
    db.close();db=null;
    const SQLite=require('better-sqlite3');
    const native=new SQLite(path.join(root,'data','dashboard.db'));
    native.pragma('user_version = 1');
    native.close();
    db=openDashboardDatabase(root);
    assert.equal(db.loadState().cards[0].data.html,html);
    assert.deepEqual(db.getAttachment('pic').bytes,[137,80,78,71]);
    assert.ok(awaitableExists(db.backupIfDue));
  } finally {if(db)db.close();fs.rmSync(root,{recursive:true,force:true});}
});
function awaitableExists(value){return typeof value==='function';}

test('Deleting a memo bundle sends notes to shared trash and preserves origin labels', () => {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'dashboard-group-delete-'));
  const db=openDashboardDatabase(root);
  try {
    db.upsertNote({id:'n1',cardId:'group1',title:'첫째',sortOrder:0});
    db.upsertNote({id:'n2',cardId:'group1',title:'둘째',sortOrder:1});
    db.upsertNote({id:'n3',cardId:'group2',title:'다른 묶음',sortOrder:0});
    assert.equal(db.trashCardNotes('group1','삭제 전 업무 묶음'),2);
    assert.equal(db.listNotes('group1').length,0);
    assert.equal(db.listNotes('group2').length,1);
    assert.equal(db.listTrash().length,2);
    assert.ok(db.listTrash().every(note=>note.originalCardTitle==='삭제 전 업무 묶음'));
    assert.equal(db.restoreNotes([{id:'n1',cardId:'group2'}]),1);
    assert.deepEqual(db.listNotes('group2').map(note=>note.id),['n3','n1']);
  } finally {db.close();fs.rmSync(root,{recursive:true,force:true});}
});
