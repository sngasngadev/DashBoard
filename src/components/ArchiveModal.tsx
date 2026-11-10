import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import type { CardRecord } from '../types/dashboard';

type ArchivedNote={id:string;title:string;preview:string;body:string;originalCardId:string;originalCardTitle:string;archivedAt:string};
type Group={id:string;title:string};
export function ArchiveModal({open,cards,groups,onClose,onRestoreCard,onRestoreNote}:{
  open:boolean;cards:(CardRecord&{archivedAt?:string})[];groups:Group[];onClose:()=>void;
  onRestoreCard:(id:string)=>void;
  onRestoreNote:(id:string,destination:string)=>Promise<void>;
}) {
  const [notes,setNotes]=useState<ArchivedNote[]>([]);
  const [search,setSearch]=useState('');
  const [destinations,setDestinations]=useState<Record<string,string>>({});
  const [loading,setLoading]=useState(false);
  const [expanded,setExpanded]=useState<string|null>(null);
  const [error,setError]=useState('');
  const refresh=async()=>{
    try{setNotes(window.dashboardDesktop?await window.dashboardDesktop.listArchive() as ArchivedNote[]:[]);setError('');}
    catch(e){setError(String(e));}
  };
  useEffect(()=>{if(open)void refresh();},[open]);
  if(!open)return null;
  const matchingCards=cards.filter(card=>(card.title+' '+card.type+' '+JSON.stringify(card.data)).toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  const matchingNotes=notes.filter(note=>(note.title+' '+note.body+' '+note.originalCardTitle).toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  const restoreNote=async(note:ArchivedNote)=>{
    const destination=destinations[note.id]|| (groups.some(g=>g.id===note.originalCardId)?note.originalCardId:'__new__');
    setLoading(true);
    try{await onRestoreNote(note.id,destination);await refresh();}
    catch(e){setError(String(e));}
    finally{setLoading(false);}
  };
  return <div className="modal-backdrop" onMouseDown={onClose}>
    <div className="modal archive-modal" onMouseDown={e=>e.stopPropagation()}>
      <div className="modal-heading"><div><h2>보관함</h2><p>보관한 항목은 자동 삭제되지 않습니다.</p></div><button className="icon-button" onClick={onClose} aria-label="닫기"><X size={18}/></button></div>
      <label className="bundle-search"><Search size={16}/><input aria-label="보관함 검색" value={search} onChange={e=>setSearch(e.target.value)} placeholder="카드 및 메모 검색"/></label>
      <div className="archive-scroll">
        <h3>보관한 카드 ({matchingCards.length})</h3>
        {matchingCards.map(card=><div className="archive-entry" key={card.id}>
          <span><strong>{card.title}</strong><small>카드 · {card.type} · {card.archivedAt?.slice(0,10)||''}</small></span>
          <button className="button secondary" onClick={()=>onRestoreCard(card.id)}>카드 복원</button>
        </div>)}
        {matchingCards.length===0&&<p className="archive-muted">보관한 카드가 없습니다.</p>}
        <h3>보관한 개별 메모 ({matchingNotes.length})</h3>
        {matchingNotes.map(note=><div className="archive-entry" key={note.id}>
          <span><strong>{note.title||'제목 없음'}</strong><small>원래 묶음: {groups.find(g=>g.id===note.originalCardId)?.title||note.originalCardTitle||'삭제된 묶음'}</small><small>{note.preview||'본문 없음'}</small><button type="button" className="archive-expand" onClick={()=>setExpanded(expanded===note.id?null:note.id)}>{expanded===note.id?'내용 접기':'내용 전체 보기'}</button>{expanded===note.id&&<p className="archive-fulltext">{note.body||'본문 없음'}</p>}</span>
          <div className="archive-restore-options">
            <select aria-label={note.title+' 복원할 묶음'} value={destinations[note.id]|| (groups.some(g=>g.id===note.originalCardId)?note.originalCardId:'__new__')} onChange={e=>setDestinations(prev=>({...prev,[note.id]:e.target.value}))}>
              {groups.map(g=><option key={g.id} value={g.id}>{g.title}</option>)}
              <option value="__new__">새 메모묶음 만들기</option>
            </select>
            <button className="button secondary" disabled={loading} onClick={()=>void restoreNote(note)}>복원</button>
          </div>
        </div>)}
        {matchingNotes.length===0&&<p className="archive-muted">보관한 메모가 없습니다.</p>}
      </div>
      {error&&<p className="bundle-error" role="alert">{error}</p>}
    </div>
  </div>;
}
