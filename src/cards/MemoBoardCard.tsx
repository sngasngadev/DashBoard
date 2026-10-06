import { GripVertical, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { BoardNote, MemoBoardData, NoteColor } from '../types/dashboard';
import { makeId } from '../lib/id';
import { packNotes, reorderNotes } from '../lib/postitLayout';

const colors: NoteColor[] = ['yellow', 'pink', 'blue', 'green', 'lavender'];
export function MemoBoardCard({ data, onChange, onAskDelete, detail = false }: {
  data: MemoBoardData;
  onChange: (data: MemoBoardData) => void;
  onAskDelete: (note: BoardNote) => void;
  detail?: boolean;
}) {
  const [openPalette, setOpenPalette] = useState<string | null>(null);
  const [canvasWidth, setCanvasWidth] = useState(0);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragTarget, setDragTarget] = useState<{ id: string; after: boolean } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragTargetRef = useRef<{ id: string; after: boolean } | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const element = canvasRef.current;
    const update = () => setCanvasWidth(element.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const packed = useMemo(() => packNotes(data.notes, canvasWidth), [data.notes, canvasWidth]);
  const packedById = useMemo(() => new Map(packed.map(item => [item.id, item])), [packed]);
  const canvasHeight = Math.max(150, ...packed.map(item => item.y + item.height), 0);

  const add = () => onChange({
    ...data,
    notes: [...data.notes, {
      id: makeId('note'),
      text: '',
      color: colors[data.notes.length % colors.length],
      width: 240,
      height: 190
    }]
  });

  const patch = (id: string, patchValue: Partial<BoardNote>) =>
    onChange({ ...data, notes: data.notes.map(note => note.id === id ? { ...note, ...patchValue } : note) });

  return <div className={`memo-board ${detail ? 'detail-mode' : ''}`}>
    <div className="postit-canvas" ref={canvasRef} style={{ height: canvasHeight }}>
      {data.notes.map(note => {
        const layout = packedById.get(note.id);
        if (!layout) return null;
        return <div
          key={note.id}
          data-note-id={note.id}
          className={`postit ${note.color} ${draggingId === note.id ? 'dragging' : ''} ${dragTarget?.id === note.id ? `drag-target ${dragTarget.after ? 'insert-after' : 'insert-before'}` : ''}`}
          style={{ width: layout.width, height: layout.height, left: layout.x, top: layout.y }}
        >
          <button
            type="button"
            className="postit-move-handle"
            aria-label="포스트잇 이동"
            title="잡고 이동"
            onPointerDown={e => {
              e.preventDefault();
              e.stopPropagation();
              const pointerId = e.pointerId;
              const target = e.currentTarget;
              target.setPointerCapture(pointerId);
              setDraggingId(note.id);

              const move = (event: PointerEvent) => {
                const element = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null;
                const postit = element?.closest<HTMLElement>('.postit[data-note-id]');
                const targetId = postit?.dataset.noteId;
                if (!targetId || targetId === note.id) {
                  dragTargetRef.current = null;
                  setDragTarget(null);
                  return;
                }
                const rect = postit.getBoundingClientRect();
                const after = event.clientY > rect.top + rect.height / 2 ||
                  (Math.abs(event.clientY - (rect.top + rect.height / 2)) < rect.height * 0.3 &&
                   event.clientX > rect.left + rect.width / 2);
                dragTargetRef.current = { id: targetId, after };
                setDragTarget({ id: targetId, after });
              };

              const stop = () => {
                const destination = dragTargetRef.current;
                if (destination) {
                  onChange({ ...data, notes: reorderNotes(data.notes, note.id, destination.id, destination.after) });
                }
                dragTargetRef.current = null;
                setDraggingId(null);
                setDragTarget(null);
                target.releasePointerCapture?.(pointerId);
                window.removeEventListener('pointermove', move);
                window.removeEventListener('pointerup', stop);
                window.removeEventListener('pointercancel', stop);
              };

              window.addEventListener('pointermove', move);
              window.addEventListener('pointerup', stop);
              window.addEventListener('pointercancel', stop);
            }}
          ><GripVertical size={14}/></button>

          <textarea value={note.text} onChange={e => patch(note.id, { text: e.target.value })} />

          <div className="postit-footer">
            <div className="postit-actions">
              <div className={`color-picker ${openPalette === note.id ? 'open' : ''}`}>
                <button
                  type="button"
                  className={`color-dot current ${note.color}`}
                  aria-label="포스트잇 색상 변경"
                  title="색상 변경"
                  onClick={() => setOpenPalette(openPalette === note.id ? null : note.id)}
                />
                {openPalette === note.id && <div className="color-palette">
                  {colors.map(color => <button
                    key={color}
                    type="button"
                    className={`color-dot ${color} ${note.color === color ? 'selected' : ''}`}
                    aria-label={`${color} 색상`}
                    onClick={() => { patch(note.id, { color }); setOpenPalette(null); }}
                  />)}
                </div>}
              </div>
              <button className="icon-button subtle" aria-label="포스트잇 삭제" onClick={() => onAskDelete(note)}><Trash2 size={14}/></button>
            </div>
          </div>

          <button
            type="button"
            className="postit-resize-handle"
            aria-label="포스트잇 크기 조절"
            title="잡고 크기 조절"
            onPointerDown={e => {
              e.preventDefault();
              e.stopPropagation();
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
          ><span aria-hidden="true" /></button>
        </div>;
      })}
    </div>
    <button className="add-postit" onClick={add}><Plus size={18}/> 포스트잇</button>
  </div>;
}
