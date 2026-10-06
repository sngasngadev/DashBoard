import { Grip, Plus, Trash2 } from 'lucide-react';
import type { BoardNote, MemoBoardData, NoteColor } from '../types/dashboard';
import { makeId } from '../lib/id';

const colors: NoteColor[] = ['yellow', 'pink', 'blue', 'green', 'lavender'];

export function MemoBoardCard({ data, onChange, onAskDelete, detail = false }: {
  data: MemoBoardData;
  onChange: (data: MemoBoardData) => void;
  onAskDelete: (note: BoardNote) => void;
  detail?: boolean;
}) {
  const add = () => onChange({ ...data, notes: [...data.notes, { id: makeId('note'), text: '', color: colors[data.notes.length % colors.length], width: 240, height: 190 }] });
  const patch = (id: string, patchValue: Partial<BoardNote>) => onChange({ ...data, notes: data.notes.map(note => note.id === id ? { ...note, ...patchValue } : note) });

  return <div className={`memo-board ${detail ? 'detail-mode' : ''}`}>
    <div className="postit-grid">
      {data.notes.map(note => <div
        key={note.id}
        className={`postit ${note.color}`}
        style={detail ? { width: note.width ?? 240, height: note.height ?? 190 } : undefined}
      >
        <textarea value={note.text} onChange={e => patch(note.id, { text: e.target.value })} />
        <div className="postit-footer">
          <div className="color-dots">{colors.map(color => <button key={color} className={`color-dot ${color} ${note.color === color ? 'selected' : ''}`} aria-label={`${color} 색상`} onClick={() => patch(note.id, { color })} />)}</div>
          <button className="icon-button subtle" aria-label="포스트잇 삭제" onClick={() => onAskDelete(note)}><Trash2 size={14}/></button>
        </div>
        {detail && <button
          type="button"
          className="postit-resize-handle"
          aria-label="포스트잇 크기 조절"
          title="잡고 크기 조절"
          onPointerDown={e => {
            e.preventDefault();
            e.currentTarget.setPointerCapture(e.pointerId);
            const startX = e.clientX;
            const startY = e.clientY;
            const startWidth = note.width ?? 240;
            const startHeight = note.height ?? 190;
            const target = e.currentTarget;
            const move = (event: PointerEvent) => {
              patch(note.id, {
                width: Math.max(180, Math.min(600, startWidth + event.clientX - startX)),
                height: Math.max(140, Math.min(500, startHeight + event.clientY - startY))
              });
            };
            const stop = () => {
              target.releasePointerCapture?.(e.pointerId);
              window.removeEventListener('pointermove', move);
              window.removeEventListener('pointerup', stop);
              window.removeEventListener('pointercancel', stop);
            };
            window.addEventListener('pointermove', move);
            window.addEventListener('pointerup', stop);
            window.addEventListener('pointercancel', stop);
          }}
        ><Grip size={14}/></button>}
      </div>)}
      <button className="add-postit" onClick={add}><Plus size={18}/> 포스트잇</button>
    </div>
  </div>;
}
