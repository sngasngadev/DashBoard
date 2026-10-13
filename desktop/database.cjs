'use strict';
const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

const SCHEMA_VERSION = 1;

function openDashboardDatabase(root) {
  const dataDir = path.join(root, 'data');
  const backupDir = path.join(root, 'backups');
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(backupDir, { recursive: true });
  const file = path.join(dataDir, 'dashboard.db');
  const db = new Database(file, { timeout: 5000 });
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = FULL');

  const version = db.pragma('user_version', { simple: true });
  if (version > SCHEMA_VERSION) {
    db.close();
    throw new Error('이 프로그램보다 새로운 버전의 데이터베이스입니다. 기존 데이터를 변경하지 않았습니다.');
  }
  if (version < 1) {
    db.transaction(() => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS dashboard_state (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          payload TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS notes (
          id TEXT PRIMARY KEY,
          card_id TEXT NOT NULL,
          title TEXT NOT NULL DEFAULT '',
          document_json TEXT NOT NULL,
          plain_text TEXT NOT NULL DEFAULT '',
          sort_order INTEGER NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          deleted_at TEXT,
          original_card_title TEXT NOT NULL DEFAULT ''
        );
        CREATE INDEX IF NOT EXISTS idx_notes_card_order ON notes(card_id, deleted_at, sort_order);
        CREATE INDEX IF NOT EXISTS idx_notes_deleted ON notes(deleted_at);
        CREATE TABLE IF NOT EXISTS attachments (
          id TEXT PRIMARY KEY,
          mime_type TEXT NOT NULL,
          data BLOB NOT NULL,
          created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS note_attachments (
          note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
          attachment_id TEXT NOT NULL REFERENCES attachments(id) ON DELETE RESTRICT,
          PRIMARY KEY(note_id, attachment_id)
        );
        CREATE VIRTUAL TABLE IF NOT EXISTS note_search USING fts5(
          title, plain_text, content='notes', content_rowid='rowid', tokenize='trigram'
        );
        CREATE TRIGGER IF NOT EXISTS notes_ai AFTER INSERT ON notes BEGIN
          INSERT INTO note_search(rowid,title,plain_text) VALUES (new.rowid,new.title,new.plain_text);
        END;
        CREATE TRIGGER IF NOT EXISTS notes_ad AFTER DELETE ON notes BEGIN
          INSERT INTO note_search(note_search,rowid,title,plain_text) VALUES('delete',old.rowid,old.title,old.plain_text);
        END;
        CREATE TRIGGER IF NOT EXISTS notes_au AFTER UPDATE ON notes BEGIN
          INSERT INTO note_search(note_search,rowid,title,plain_text) VALUES('delete',old.rowid,old.title,old.plain_text);
          INSERT INTO note_search(rowid,title,plain_text) VALUES(new.rowid,new.title,new.plain_text);
        END;
      `);
      db.pragma('user_version = 1');
    })();
  }

  function loadState() {
    const row = db.prepare('SELECT payload FROM dashboard_state WHERE id = 1').get();
    if (!row) return null;
    try {
      const state = JSON.parse(row.payload);
      if (!state || state.version !== 1 || !Array.isArray(state.cards)) throw new Error('unsupported');
      return state;
    } catch {
      throw new Error('저장 데이터가 손상되어 자동 초기화를 중단했습니다.');
    }
  }
  function saveState(state) {
    if (!state || state.version !== 1 || !Array.isArray(state.cards)) throw new Error('잘못된 대시보드 데이터');
    db.prepare(`INSERT INTO dashboard_state(id,payload,updated_at) VALUES(1,?,?)
      ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,updated_at=excluded.updated_at`)
      .run(JSON.stringify(state), new Date().toISOString());
    return true;
  }

  function upsertNote(note) {
    if (!note || typeof note.id !== 'string' || typeof note.cardId !== 'string') throw new Error('잘못된 메모');
    const documentJson=JSON.stringify(note.document || {html:''});
    const references=[...new Set([...String(note.document?.html || '').matchAll(/data-attachment-id="([^"]+)"/g)].map(match=>match[1]))];
    return db.transaction(() => {
      db.prepare(`INSERT INTO notes(id,card_id,title,document_json,plain_text,sort_order,created_at,updated_at,deleted_at,original_card_title)
        VALUES(@id,@cardId,@title,@documentJson,@plainText,@sortOrder,@createdAt,@updatedAt,NULL,'')
        ON CONFLICT(id) DO UPDATE SET title=excluded.title,document_json=excluded.document_json,
        plain_text=excluded.plain_text,sort_order=excluded.sort_order,updated_at=excluded.updated_at`)
        .run({
          id: note.id,cardId:note.cardId,title:note.title || '',
          documentJson,plainText:note.plainText || '',sortOrder:note.sortOrder ?? 0,
          createdAt:note.createdAt || new Date().toISOString(),updatedAt:new Date().toISOString()
        });
      db.prepare('DELETE FROM note_attachments WHERE note_id=?').run(note.id);
      const insert=db.prepare('INSERT INTO note_attachments(note_id,attachment_id) VALUES(?,?)');
      for(const id of references)insert.run(note.id,id);
      return true;
    })();
  }

  function listNotes(cardId) {
    return db.prepare(`SELECT id,card_id AS cardId,title,substr(plain_text,1,160) AS preview,
      sort_order AS sortOrder,updated_at AS updatedAt
      FROM notes WHERE card_id=? AND deleted_at IS NULL ORDER BY sort_order,created_at,id`).all(cardId);
  }
  function getNote(id) {
    const note = db.prepare('SELECT * FROM notes WHERE id=? AND deleted_at IS NULL').get(id);
    return note ? {
      id:note.id,cardId:note.card_id,title:note.title,document:JSON.parse(note.document_json),
      sortOrder:note.sort_order,updatedAt:note.updated_at
    } : null;
  }
  function searchNotes(cardId, query, field='all') {
    const q=String(query||'').trim().slice(0,200);
    if(!q)return listNotes(cardId);
    const condition=field==='title'?'instr(n.title,?)>0':
      field==='body'?'instr(n.plain_text,?)>0':
      '(instr(n.title,?)>0 OR instr(n.plain_text,?)>0)';
    const args=field==='all'?[cardId,q,q,q,q]:[cardId,q,q,q];
    const sql=`SELECT n.id,n.card_id AS cardId,n.title,
      substr(n.plain_text,CASE WHEN instr(n.plain_text,?)>60
        THEN instr(n.plain_text,?)-60 ELSE 1 END,160) AS preview,
      n.sort_order AS sortOrder,n.updated_at AS updatedAt
      FROM notes n WHERE n.card_id=? AND n.deleted_at IS NULL AND ${condition}
      ORDER BY n.sort_order,n.created_at,n.id LIMIT 500`;
    return db.prepare(sql).all(q,q,...(field==='all'?[cardId,q,q]:[cardId,q]));
  }

  function reorderNotes(cardId, ids) {
    if (!Array.isArray(ids) || new Set(ids).size !== ids.length) throw new Error('잘못된 메모 순서');
    const rows = db.prepare('SELECT id FROM notes WHERE card_id=? AND deleted_at IS NULL').all(cardId);
    if (rows.length !== ids.length || rows.some(row => !ids.includes(row.id))) throw new Error('메모 목록이 변경되었습니다. 다시 불러오세요.');
    return db.transaction(() => {
      const update=db.prepare('UPDATE notes SET sort_order=? WHERE id=? AND card_id=? AND deleted_at IS NULL');
      ids.forEach((id,index)=>update.run(index,id,cardId));
      return true;
    })();
  }
  function trashNote(id, originalCardTitle) {
    return db.prepare('UPDATE notes SET deleted_at=?,original_card_title=? WHERE id=? AND deleted_at IS NULL')
      .run(new Date().toISOString(), originalCardTitle || '', id).changes === 1;
  }
  function trashCardNotes(cardId, originalCardTitle) {
    return db.prepare('UPDATE notes SET deleted_at=?,original_card_title=? WHERE card_id=? AND deleted_at IS NULL')
      .run(new Date().toISOString(), originalCardTitle || '', cardId).changes;
  }
  function listTrash() {
    return db.prepare(`SELECT id,title,card_id AS originalCardId,original_card_title AS originalCardTitle,
      substr(plain_text,1,160) AS preview,deleted_at AS deletedAt FROM notes
      WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC`).all();
  }
  function restoreNotes(items) {
    return db.transaction(() => {
      let restored = 0;
      for (const {id, cardId} of items) {
        const row = db.prepare('SELECT card_id FROM notes WHERE id=? AND deleted_at IS NOT NULL').get(id);
        if (!row) continue;
        const target = cardId || row.card_id;
        const maximum = db.prepare('SELECT MAX(sort_order) AS n FROM notes WHERE card_id=? AND deleted_at IS NULL').get(target).n;
        restored += db.prepare('UPDATE notes SET card_id=?,sort_order=?,deleted_at=NULL WHERE id=? AND deleted_at IS NOT NULL')
          .run(target,(maximum ?? -1)+1,id).changes;
      }
      return restored;
    })();
  }
  function permanentlyDeleteNotes(ids) {
    return db.transaction(() => {
      let count = 0;
      for (const id of ids) {
        count += db.prepare('DELETE FROM notes WHERE id=? AND deleted_at IS NOT NULL').run(id).changes;
      }
      // Keep attachments if still referenced; purge unused blobs only on explicit deletion.
      db.prepare('DELETE FROM attachments WHERE NOT EXISTS (SELECT 1 FROM note_attachments WHERE attachment_id=attachments.id)').run();
      return count;
    })();
  }
  function saveAttachment(id,mimeType,bytes) {
    if (!/^image\/(png|jpeg|gif|webp)$/.test(mimeType) || !Array.isArray(bytes) || bytes.length > 20*1024*1024) {
      throw new Error('지원하지 않는 이미지 형식 또는 크기입니다.');
    }
    db.prepare('INSERT INTO attachments(id,mime_type,data,created_at) VALUES(?,?,?,?)')
      .run(id,mimeType,Buffer.from(bytes),new Date().toISOString());
    return true;
  }
  function getAttachment(id) {
    const row = db.prepare('SELECT mime_type AS mimeType,data FROM attachments WHERE id=?').get(id);
    return row ? { mimeType:row.mimeType, bytes:Array.from(row.data) } : null;
  }
  async function backupIfDue() {
    const files=fs.readdirSync(backupDir).filter(file=>/^dashboard-.*\\.db$/.test(file));
    const newest=Math.max(0,...files.map(file=>fs.statSync(path.join(backupDir,file)).mtimeMs));
    if(Date.now()-newest<24*60*60*1000)return null;
    return backup();
  }
  async function backup() {
    const dest = path.join(backupDir,'dashboard-'+new Date().toISOString().replace(/[:.]/g,'-')+'.db');
    await db.backup(dest);
    const all = fs.readdirSync(backupDir).filter(f=>/^dashboard-.*\.db$/.test(f)).sort().reverse();
    for (const stale of all.slice(10)) fs.unlinkSync(path.join(backupDir,stale));
    return dest;
  }
  return { loadState, saveState, upsertNote, listNotes, getNote, searchNotes,
    reorderNotes, trashNote, trashCardNotes, listTrash, restoreNotes, permanentlyDeleteNotes,
    saveAttachment, getAttachment, backup, backupIfDue, close:()=>db.close() };
}
module.exports = { openDashboardDatabase };
