import { Plus, Trash2 } from 'lucide-react';
import type { BoardNote, MemoBoardData, NoteColor } from '../types/dashboard';
import { makeId } from '../lib/id';

const colors: NoteColor[] = ['yellow', 'pink', 'blue', 'green', 'lavender'];

export function MemoBoardCard({ data, onChange, onAskDelete, detail = false }: {
  data: MemoBoardData;
  onChange: (data: MemoBoardData) => void;
  onAskDelete: (note: BoardNote) => void;
  detail?: boolean;
}) {
  const add = () => onChange({ ...data, notes: [...data.notes, { id: makeId('note'), text: '', color: colors[data.notes.length % colors.length] }] });
  const patch = (id: string, patchValue: Partial<BoardNote>) => onChange({ ...data, notes: data.notes.map(note => note.id === id ? { ...note, ...patchValue } : note) });

  return <div className={`memo-board ${detail ? 'detail-mode' : ''}`}>
    <div className="postit-grid">
      {data.notes.map(note => <div key={note.id} className={`postit ${note.color}`}>
        <textarea value={note.text} onChange={e => patch(note.id, { text: e.target.value })} placeholder="메모" />
        <div className="postit-footer">
          <div className="color-dots">{colors.map(color => <button key={color} className={`color-dot ${color} ${note.color === color ? 'selected' : ''}`} aria-label={`${color} 색상`} onClick={() => patch(note.id, { color })} />)}</div>
          <button className="icon-button subtle" aria-label="포스트잇 삭제" onClick={() => onAskDelete(note)}><Trash2 size={14}/></button>
        </div>
      </div>)}
      <button className="add-postit" onClick={add}><Plus size={18}/> 포스트잇</button>
    </div>
  </div>;
}
