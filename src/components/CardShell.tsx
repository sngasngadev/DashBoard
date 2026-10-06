import { Maximize2, Star, Trash2 } from 'lucide-react';
import type { CardRecord } from '../types/dashboard';

export function CardShell({ card, children, onTitle, onFavorite, onDelete, onOpenDetail, detail = false }: {
  card: CardRecord;
  children: React.ReactNode;
  onTitle: (title: string) => void;
  onFavorite: () => void;
  onDelete: () => void;
  onOpenDetail?: () => void;
  detail?: boolean;
}) {
  return <section className={`dashboard-card ${detail ? 'detail-card' : ''}`}>
    <header className="card-header">
      <input className="card-title drag-cancel" value={card.title} onChange={e => onTitle(e.target.value)} aria-label="카드 제목" />
      <div className="card-actions drag-cancel">
        {!detail && onOpenDetail && <button className="icon-button subtle" title="크게 보기" aria-label="카드 크게 보기" onClick={onOpenDetail}><Maximize2 size={16}/></button>}
        <button className={`icon-button subtle ${card.favorite ? 'favorite' : ''}`} title={card.favorite ? '즐겨찾기 해제' : '즐겨찾기'} aria-label="즐겨찾기" onClick={onFavorite}><Star size={17} fill={card.favorite ? 'currentColor' : 'none'}/></button>
        <button className="icon-button subtle" title={card.favorite ? '즐겨찾기 해제 후 삭제할 수 있습니다.' : '카드 삭제'} aria-label="카드 삭제" disabled={card.favorite} onClick={onDelete}><Trash2 size={16}/></button>
      </div>
    </header>
    <div className="card-body">{children}</div>
  </section>;
}
