import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { TodoData, TodoItem } from '../types/dashboard';
import { makeId } from '../lib/id';

export function TodoCard({ data, onChange, onAskDelete, detail = false }: {
  data: TodoData;
  onChange: (data: TodoData) => void;
  onAskDelete: (item: TodoItem) => void;
  detail?: boolean;
}) {
  const [draft, setDraft] = useState('');
  const active = data.items.filter(i => !i.done);
  const completed = data.items.filter(i => i.done);

  const add = () => {
    if (!draft.trim()) return;
    onChange({ ...data, items: [...data.items, { id: makeId('todo'), text: draft.trimEnd(), done: false, createdAt: new Date().toISOString() }] });
    setDraft('');
  };

  const patch = (id: string, patch: Partial<TodoItem>) => onChange({ ...data, items: data.items.map(item => item.id === id ? { ...item, ...patch } : item) });

  const renderItem = (item: TodoItem) => (
    <div className={`todo-item ${item.done ? 'done' : ''}`} key={item.id}>
      <input className="todo-check" type="checkbox" checked={item.done} onChange={e => patch(item.id, { done: e.target.checked })} />
      <textarea value={item.text} rows={item.text.includes('\n') ? Math.min(5, item.text.split('\n').length) : 1} onChange={e => patch(item.id, { text: e.target.value })} aria-label="할 일 내용" />
      <button className="icon-button subtle" aria-label="할 일 삭제" onClick={() => onAskDelete(item)}><Trash2 size={15}/></button>
    </div>
  );

  return <div className={`todo-card-content ${detail ? 'detail-mode' : ''}`}>
    <div className="todo-summary"><strong>{active.length}</strong>개 남음</div>
    <div className="todo-list">{active.map(renderItem)}{active.length === 0 && <div className="empty-inline">남은 할 일이 없습니다.</div>}</div>
    {completed.length > 0 && <div className="completed-section">
      <button className="completed-toggle" onClick={() => onChange({ ...data, completedCollapsed: !data.completedCollapsed })}>
        {data.completedCollapsed ? <ChevronRight size={16}/> : <ChevronDown size={16}/>} 완료 {completed.length}
      </button>
      {!data.completedCollapsed && <div className="todo-list completed-list">{completed.map(renderItem)}</div>}
    </div>}
    <div className="todo-add">
      <textarea placeholder="새 할 일을 입력하세요. Enter는 줄바꿈입니다." value={draft} onChange={e => setDraft(e.target.value)} rows={detail ? 3 : 2} />
      <button className="button primary" onClick={add} disabled={!draft.trim()}><Plus size={17}/> 추가</button>
    </div>
  </div>;
}
