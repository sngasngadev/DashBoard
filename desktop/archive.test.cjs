'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {openDashboardDatabase}=require('./database.cjs');

test('Archive preserves individual notes, attachments and allows restore to another bundle',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'dash-archive-'));
 let db;
 try{
  db=openDashboardDatabase(root);
  db.saveAttachment('attachment','image/png',[137,80,78,71]);
  db.upsertNote({id:'n',cardId:'old-bundle',title:'과거 메모',plainText:'원본 보존',sortOrder:0,
    document:{html:'<p>원본 보존</p><img data-attachment-id="attachment" src="attachment://attachment">'}});
  assert.equal(db.archiveNote('n','2026 업무 묶음'),true);
  assert.equal(db.getNote('n'),null);
  assert.equal(db.listNotes('old-bundle').length,0);
  assert.equal(db.searchNotes('old-bundle','원본','body').length,0);
  assert.equal(db.listArchive()[0].originalCardTitle,'2026 업무 묶음');
  assert.equal(db.restoreArchive([{id:'n',cardId:'new-bundle'}]),1);
  assert.equal(db.listArchive().length,0);
  assert.equal(db.getNote('n').cardId,'new-bundle');
  assert.equal(db.getAttachment('attachment').mimeType,'image/png');
  assert.equal(db.listNotes('new-bundle').length,1);
  db.close();db=null;
  db=openDashboardDatabase(root);
  assert.equal(db.listNotes('new-bundle').length,1);
 }finally{db?.close();fs.rmSync(root,{recursive:true,force:true});}
});

test('Existing SQLite database is migrated without losing notes',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'dash-archive-schema-'));
 let db;
 try{
  db=openDashboardDatabase(root);
  db.upsertNote({id:'old',cardId:'group',title:'Old title',plainText:'Old body',sortOrder:0});
  db.close();db=null;
  const native=require('better-sqlite3')(path.join(root,'data','dashboard.db'));
  native.exec('DROP INDEX idx_notes_archived; ALTER TABLE notes DROP COLUMN archived_at;');
  native.pragma('user_version = 2');native.close();
  db=openDashboardDatabase(root);
  assert.equal(db.getNote('old').title,'Old title');
  assert.equal(db.archiveNote('old','Old group'),true);
  assert.equal(db.listArchive().length,1);
 }finally{db?.close();fs.rmSync(root,{recursive:true,force:true});}
});
