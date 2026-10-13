import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

type Deleted={id:string;title:string;originalCardId:string;originalCardTitle:string;preview:string;deletedAt:string};
type Group={id:string;title:string};
export function TrashModal({open,groups,onClose}:{
  open:boolean; groups:Group[]; onClose:()=>void;
}) {
  const [items,setItems]=useState<Deleted[]>([]);
  const [checked,setChecked]=useState<string[]>([]);
  const [error,setError]=useState('');
  const refresh=async()=>{
    try{setItems(await window.dashboardDesktop!.listTrash() as Deleted[]);setChecked([]);setError('');}
    catch(e){setError(String(e));}
  };
  useEffect(()=>{if(open&&window.dashboardDesktop)void refresh();},[open]);
  if(!open)return null;
  const all=items.length>0&&checked.length===items.length;
  const restore=async()=>{
    if(!checked.length)return;
    const assignments:{id:string;cardId:string}[]=[];
    for(const id of checked){
      const item=items.find(x=>x.id===id);
      if(!item)continue;
      const original=groups.find(x=>x.id===item.originalCardId);
      let cardId=original?.id;
      if(!cardId){
        if(!groups.length){setError('복원할 메모묶음이 없습니다. 먼저 메모묶음을 추가하세요.');return;}
        const suggestion=groups.map((g,i)=>String(i+1)+': '+g.title).join('\n');
        const choice=window.prompt('원래 메모묶음이 없습니다. 복원할 묶음 번호를 입력하세요.\n'+suggestion);
        if(choice===null)return;
        cardId=groups[Number(choice)-1]?.id;
        if(!cardId){setError('올바른 메모묶음 번호를 입력하세요.');return;}
      }
      assignments.push({id,cardId});
    }
    try{await window.dashboardDesktop!.restoreNotes(assignments);await refresh();}
    catch(e){setError(String(e));}
  };
  const remove=async()=>{
    if(!checked.length||!window.confirm(checked.length+'개 메모를 영구 삭제할까요? 복구할 수 없습니다.'))return;
    try{await window.dashboardDesktop!.permanentlyDeleteNotes(checked);await refresh();}
    catch(e){setError(String(e));}
  };
  return <div className="modal-backdrop" onMouseDown={onClose}>
    <div className="modal trash-modal" onMouseDown={e=>e.stopPropagation()}>
      <div className="modal-heading"><div><h2>휴지통</h2><p>삭제된 메모를 묶음별로 확인하고 복원할 수 있습니다.</p></div><button className="icon-button" aria-label="닫기" onClick={onClose}><X size={18}/></button></div>
      <label className="trash-select-all"><input type="checkbox" checked={all} onChange={e=>setChecked(e.target.checked?items.map(i=>i.id):[])}/> 전체 선택 / 전체 선택 해제 <small>{checked.length}개 선택됨</small></label>
      <div className="trash-list">{items.map(item=><label key={item.id} className="trash-item">
        <input type="checkbox" checked={checked.includes(item.id)} onChange={e=>setChecked(prev=>e.target.checked?[...prev,item.id]:prev.filter(id=>id!==item.id))}/>
        <span><strong>{item.title||'제목 없음'}</strong><small>메모묶음: {groups.find(x=>x.id===item.originalCardId)?.title||item.originalCardTitle||'삭제된 묶음'}</small><span className="trash-preview">{item.preview||'미리볼 내용 없음'}</span></span>
      </label>)}</div>
      {items.length===0&&<p>삭제된 메모가 없습니다.</p>}
      {error&&<p role="alert" className="bundle-error">{error}</p>}
      <div className="button-row"><button className="button secondary" onClick={()=>void restore()} disabled={!checked.length}>선택 복원</button><button className="button secondary" onClick={()=>void remove()} disabled={!checked.length}>선택 영구 삭제</button></div>
    </div>
  </div>;
}
