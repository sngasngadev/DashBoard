import { CARD_TYPES } from '../cards/registry';
import type { CardType } from '../types/dashboard';
import { CalendarDays, CheckSquare2, FileText, StickyNote, X } from 'lucide-react';

const icons = { todo: CheckSquare2, schedule: CalendarDays, memo: FileText, memoBoard: StickyNote };

export function AddCardModal({ open, onAdd, onClose }: { open: boolean; onAdd: (type: CardType) => void; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal add-card-modal" onMouseDown={e => e.stopPropagation()}>
        <div className="modal-heading">
          <div><h2>카드 추가</h2><p>추가할 카드 종류를 선택하세요.</p></div>
          <button className="icon-button" aria-label="닫기" onClick={onClose}><X size={19} /></button>
        </div>
        <div className="card-type-list">
          {CARD_TYPES.map(item => {
            const Icon = icons[item.type];
            return <button key={item.type} className="card-type-option" onClick={() => onAdd(item.type)}>
              <span className="card-type-icon"><Icon size={21} /></span>
              <span><strong>{item.label}</strong><small>{item.description}</small></span>
            </button>;
          })}
        </div>
      </div>
    </div>
  );
}
