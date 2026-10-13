import { useEffect, useRef, useState } from 'react';
import { GripVertical, Plus, Search, Trash2 } from 'lucide-react';
import { makeId } from '../lib/id';

type Summary={id:string;cardId:string;title:string;preview:string;sortOrder:number};
type Note={id:string;cardId:string;title:string;document:{html?:string;type?:string};sortOrder:number;updatedAt:string};
const api=()=>window.dashboardDesktop;
const readable=(html:string)=>{const element=document.createElement('div');element.innerHTML=html;return element.textContent||'';};

export function MemoBundleCard({cardId,cardTitle,detail,onOpen}:{
  cardId:string;cardTitle:string;detail:boolean;onOpen:(id:string)=>void;
}) {
  const [items,setItems]=useState<Summary[]>([]);
  const [active,setActive]=useState<string|null>(null);
  const [note,setNote]=useState<Note|null>(null);
  const [term,setTerm]=useState('');
  const [scope,setScope]=useState<'all'|'title'|'body'>('all');
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [drag,setDrag]=useState<string|null>(null);
  const editor=useRef<HTMLDivElement>(null);
  const editing=useRef(false);
  const sequence=useRef(0);
  const refresh=async()=>{
    if(!api())return;
    try {
      const list=term.trim()?await api()!.searchNotes(cardId,term,scope):await api()!.listNotes(cardId);
      setItems(list as Summary[]);
      setError('');
    }catch(e){setError(String(e));}
  };
  useEffect(()=>{void refresh();},[cardId,term,scope]);
  useEffect(()=>{
    if(!detail||!active||!api())return;
    const seq=++sequence.current;
    editing.current=false;
    api()!.getNote(active).then(value=>{if(seq===sequence.current){setNote(value as Note|null);setError('');}}).catch(e=>setError(String(e)));
  },[active,detail]);
  useEffect(()=>{
    if(editor.current&&note&&!editing.current)editor.current.innerHTML=note.document.html||'';
  },[note?.id]);
  const select=(id:string)=>{if(!detail){onOpen(id);return;}setActive(id);};
  useEffect(()=>{
    const handler=(e:Event)=>{const id=(e as CustomEvent<string>).detail;if(detail&&id)setActive(id);};
    window.addEventListener('dashboard:open-note',handler);
    return()=>window.removeEventListener('dashboard:open-note',handler);
  },[detail]);
  const add=async()=>{
    if(!api())return;
    const item={id:makeId('memo'),cardId,title:'새 메모',document:{html:''},plainText:'',sortOrder:Math.max(-1,...items.map(i=>i.sortOrder))+1,createdAt:new Date().toISOString()};
    try {await api()!.saveNote(item);await refresh();setActive(item.id);}catch(e){setError(String(e));}
  };
  const save=async(patch:Partial<Note>)=>{
    if(!api()||!note)return;
    const updated={...note,...patch};
    const html=updated.document.html||'';
    setBusy(true);
    try{await api()!.saveNote({...updated,plainText:readable(html)});setNote(updated);await refresh();setError('');}
    catch(e){setError('저장 실패: '+String(e));}finally{setBusy(false);}
  };
  const trash=async(id:string)=>{
    if(!api()||!window.confirm('이 메모를 휴지통으로 이동할까요?'))return;
    try{await api()!.trashNote(id,cardTitle);if(active===id){setActive(null);setNote(null);}await refresh();}
    catch(e){setError(String(e));}
  };
  const reorder=async(from:string,to:string)=>{
    if(!api()||term||from===to)return;
    const copy=[...items],src=copy.findIndex(n=>n.id===from),dest=copy.findIndex(n=>n.id===to);
    if(src<0||dest<0)return;
    const [moved]=copy.splice(src,1);copy.splice(dest,0,moved);
    try {await api()!.reorderNotes(cardId,copy.map(n=>n.id));await refresh();}
    catch(e){setError(String(e));}
  };
  if(!api())return <div className="bundle-empty">메모묶음은 데스크톱 버전에서 사용할 수 있습니다.</div>;
  if(!detail)return <div className="bundle-preview">{items.map(item=><button key={item.id} onClick={()=>select(item.id)}>{item.title||'제목 없음'}</button>)}</div>;
  return <div className="bundle-container">
    <aside className="bundle-sidebar">
      <button className="button primary" onClick={add}><Plus size={15}/> 새 메모</button>
      <label className="bundle-search"><Search size={15}/><input placeholder="이 묶음 검색" value={term} onChange={e=>setTerm(e.target.value)}/></label>
      <select aria-label="검색 대상" value={scope} onChange={e=>setScope(e.target.value as typeof scope)}>
        <option value="all">제목과 본문</option><option value="title">제목만</option><option value="body">본문만</option>
      </select>
      <div className="bundle-list">{items.map(item=><div key={item.id} className={'bundle-list-item '+(active===item.id?'active':'')}
        onDragOver={e=>{if(!term)e.preventDefault();}} onDrop={e=>{e.preventDefault();if(drag)void reorder(drag,item.id);setDrag(null);}}>
        {!term&&<span draggable title="메모 순서 이동" className="bundle-grip" onDragStart={()=>setDrag(item.id)} onDragEnd={()=>setDrag(null)}><GripVertical size={14}/></span>}
        <button className="bundle-list-select" onClick={()=>select(item.id)}><strong>{item.title||'제목 없음'}</strong>{term&&<small>{item.preview}</small>}</button>
        <button className="icon-button subtle" aria-label="메모 삭제" onClick={()=>void trash(item.id)}><Trash2 size={14}/></button>
      </div>)}</div>
    </aside>
    <section className="bundle-document">
      {note&&active===note.id?<><div className="bundle-doc-header">
        <input aria-label="메모 제목" value={note.title} onChange={e=>setNote({...note,title:e.target.value})} onBlur={()=>void save({title:note.title})}/>
        <span>{busy?'저장 중':'자동 저장'}</span></div>
        <div className="bundle-editor-toolbar">
          <button onMouseDown={e=>{e.preventDefault();document.execCommand('bold');}}>굵게</button>
          <button onMouseDown={e=>{e.preventDefault();document.execCommand('italic');}}>기울임</button>
          <button onMouseDown={e=>{e.preventDefault();document.execCommand('underline');}}>밑줄</button>
          <button onMouseDown={e=>{e.preventDefault();document.execCommand('insertUnorderedList');}}>목록</button>
          <button onMouseDown={e=>{e.preventDefault();document.execCommand('insertHTML',false,'<table border="1"><tbody><tr><td>　</td><td>　</td></tr><tr><td>　</td><td>　</td></tr></tbody></table>');}}>표</button>
        </div>
        <div key={note.id} ref={editor} className="bundle-editor" contentEditable suppressContentEditableWarning
          onInput={e=>{editing.current=true;const html=e.currentTarget.innerHTML;setNote(current=>current?{...current,document:{html}}:null);}}
          onBlur={e=>{editing.current=false;void save({document:{html:e.currentTarget.innerHTML}});}}
        />
      </>:<p className="bundle-empty">왼쪽에서 메모를 선택하거나 새로 추가하세요.</p>}
      {error&&<p role="alert" className="bundle-error">{error}</p>}
    </section>
  </div>;
}
