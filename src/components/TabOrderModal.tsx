import { useEffect, useState } from 'react';
import { GripVertical, X } from 'lucide-react';
import type { CardRecord } from '../types/dashboard';

export function TabOrderModal({open,cards,onClose,onSave}:{
  open:boolean; cards:CardRecord[]; onClose:()=>void; onSave:(ids:string[])=>void;
}) {
  const [ids,setIds]=useState<string[]>([]);
  const [dragId,setDragId]=useState<string|null>(null);
  useEffect(()=>{if(open)setIds(cards.map(card=>card.id));},[open]);
  if(!open)return null;
  const byId=new Map(cards.map(card=>[card.id,card]));
  const move=(from:string,to:string)=>{
    if(from===to)return;
    setIds(prev=>{const copy=prev.filter(id=>id!==from);copy.splice(copy.indexOf(to),0,from);return copy;});
  };
  return <div className="modal-backdrop" onMouseDown={onClose}>
    <div className="modal settings-modal" onMouseDown={event=>event.stopPropagation()}>
      <div className="modal-heading"><div><h2>탭 순서 변경</h2><p>핸들을 잡고 이동하세요. 메인 탭은 고정됩니다.</p></div><button className="icon-button" onClick={onClose} aria-label="닫기"><X size={19}/></button></div>
      <div className="tab-order-row"><span>메인</span><small>고정</small></div>
      {ids.map(id=><div className="tab-order-row" key={id} draggable
        onDragStart={event=>{setDragId(id);event.dataTransfer.effectAllowed='move';}}
        onDragOver={event=>event.preventDefault()}
        onDrop={event=>{event.preventDefault();if(dragId)move(dragId,id);setDragId(null);}}
        onDragEnd={()=>setDragId(null)}>
        <GripVertical size={17}/><span>{byId.get(id)?.title||'제목 없음'}</span>
      </div>)}
      <div className="button-row"><button className="button secondary" onClick={onClose}>취소</button><button className="button primary" onClick={()=>onSave(ids)}>완료</button></div>
    </div>
  </div>;
}
