import { useCallback, useEffect, useRef, useState } from 'react';
import { GripVertical, Plus, Search, Trash2 } from 'lucide-react';
import { makeId } from '../lib/id';
import { RichTextEditor } from '../components/RichTextEditor';
import { serializeRichHtml } from '../lib/richHtml';

type Summary={id:string;cardId:string;title:string;preview:string;sortOrder:number};
type Note={id:string;cardId:string;title:string;document:{html?:string};sortOrder:number;updatedAt:string};
const api=()=>window.dashboardDesktop;
function highlightedExcerpt(text:string,query:string){
  const index=query ? text.indexOf(query) : -1;
  if(index<0)return text;
  return <>{text.slice(0,index)}<mark>{text.slice(index,index+query.length)}</mark>{text.slice(index+query.length)}</>;
}

function textFromHtml(html:string){
  const element=document.createElement('div');
  element.innerHTML=html;
  return element.textContent||'';
}
function portableHtml(html:string){
  const element=document.createElement('div');
  element.innerHTML=html;
  element.querySelectorAll<HTMLImageElement>('img[data-attachment-id]').forEach(img=>{
    img.setAttribute('src','attachment://'+img.dataset.attachmentId);
  });
  return element.innerHTML;
}

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
  const [dropAt,setDropAt]=useState<{id:string;after:boolean}|null>(null);
  const sequence=useRef(0);
  const dirty=useRef(false);
  const revision=useRef(0);
  const saves=useRef<Promise<unknown>>(Promise.resolve());
  const objectUrls=useRef<string[]>([]);

  const refresh=useCallback(async()=>{
    if(!api())return;
    const result=term.trim()?await api()!.searchNotes(cardId,term,scope):await api()!.listNotes(cardId);
    setItems(result as Summary[]);
  },[cardId,term,scope]);
  useEffect(()=>{void refresh().catch(e=>setError(String(e)));},[refresh]);

  const persist=useCallback((value:Note|null)=>{
    if(!value||!api())return Promise.resolve();
    const savingRevision=revision.current;
    const portable=portableHtml(value.document.html||'');
    const payload={...value,document:{html:portable},plainText:textFromHtml(portable)};
    setBusy(true);
    saves.current=saves.current.catch(()=>undefined).then(async()=>{
      await api()!.saveNote(payload);
      await refresh();
    });
    return saves.current.then(()=>{if(revision.current===savingRevision)dirty.current=false;setBusy(false);setError('');})
      .catch(e=>{setBusy(false);setError('저장 실패: '+String(e));});
  },[refresh]);

  useEffect(()=>{
    if(!detail||!active||!api())return;
    const seq=++sequence.current;
    dirty.current=false;
    setNote(null);
    api()!.getNote(active).then(value=>{
      if(seq===sequence.current){setNote(value as Note|null);setError('');}
    }).catch(e=>setError(String(e)));
  },[active,detail]);

  useEffect(()=>{
    if(!note||!dirty.current)return;
    const pending=setTimeout(()=>{void persist(note);},450);
    return()=>clearTimeout(pending);
  },[note?.title,note?.document.html,persist]);

  useEffect(()=>{
    const handler=(event:Event)=>{
      const id=(event as CustomEvent<string>).detail;
      if(detail&&id)setActive(id);
    };
    window.addEventListener('dashboard:open-note',handler);
    return()=>window.removeEventListener('dashboard:open-note',handler);
  },[detail]);

  useEffect(()=>()=>{objectUrls.current.forEach(URL.revokeObjectURL);objectUrls.current=[];},[]);

  const select=(id:string)=>{
    if(!detail){onOpen(id);return;}
    if(note&&dirty.current)void persist(note);
    setActive(id);
  };

  const add=async()=>{
    if(!api())return;
    try{
      const all=await api()!.listNotes(cardId) as Summary[];
      const item={
        id:makeId('memo'),cardId,title:'새 메모',
        document:{html:'<p></p>'},plainText:'',
        sortOrder:Math.max(-1,...all.map(i=>i.sortOrder))+1,
        createdAt:new Date().toISOString()
      };
      await api()!.saveNote(item);
      await refresh();
      setActive(item.id);
    }catch(e){setError(String(e));}
  };

  const trash=async(id:string)=>{
    if(!api()||!window.confirm('이 메모를 휴지통으로 이동할까요?'))return;
    try{
      if(note?.id===id&&dirty.current)await persist(note);
      await api()!.trashNote(id,cardTitle);
      if(active===id){setActive(null);setNote(null);}
      await refresh();
    }catch(e){setError(String(e));}
  };

  const reorder=async(from:string,to:string,after:boolean)=>{
    if(!api()||term||from===to)return;
    const copy=[...items],src=copy.findIndex(item=>item.id===from),dest=copy.findIndex(item=>item.id===to);
    if(src<0||dest<0)return;
    const [moved]=copy.splice(src,1);
    const target=copy.findIndex(item=>item.id===to);
    if(target<0)return;
    copy.splice(target+(after?1:0),0,moved);
    try{await api()!.reorderNotes(cardId,copy.map(item=>item.id));await refresh();}
    catch(e){setError(String(e));}
  };

  const addImage=useCallback(async(file:File)=>{
    const native=api();
    if(!native)throw new Error('데스크톱 환경에서만 이미지를 저장할 수 있습니다.');
    const id=makeId('attachment');
    await native.saveAttachment(id,file.type,Array.from(new Uint8Array(await file.arrayBuffer())));
    const src=URL.createObjectURL(file);
    objectUrls.current.push(src);
    return {src,attachmentId:id};
  },[]);

  const resolveImage=useCallback(async(id:string)=>{
    const attachment=await api()?.getAttachment(id);
    if(!attachment)throw new Error('이미지 데이터를 찾을 수 없습니다: '+id);
    return URL.createObjectURL(new Blob([new Uint8Array(attachment.bytes)],{type:attachment.mimeType}));
  },[]);

  if(!api())return <div className="bundle-empty">메모묶음은 데스크톱 버전에서 사용할 수 있습니다.</div>;
  if(!detail)return <div className="bundle-preview">{items.map(item=>
    <button key={item.id} onClick={()=>select(item.id)} title={item.title||'제목 없음'}>
      <strong>{item.title||'제목 없음'}</strong>
      <small>{item.preview?.trim()||'미리볼 본문 없음'}</small>
    </button>
  )}</div>;

  return <div className="bundle-container">
    <aside className="bundle-sidebar">
      <button className="button primary" onClick={()=>void add()}><Plus size={15}/> 새 메모</button>
      <label className="bundle-search"><Search size={15}/><input placeholder="이 묶음 검색" value={term} onChange={e=>setTerm(e.target.value)}/></label>
      <select aria-label="검색 대상" value={scope} onChange={e=>setScope(e.target.value as typeof scope)}>
        <option value="all">제목과 본문</option><option value="title">제목만</option><option value="body">본문만</option>
      </select>
      <div className="bundle-list">{items.map(item=><div key={item.id}
        className={'bundle-list-item '+(active===item.id?'active':'')+(dropAt?.id===item.id?' drop-'+(dropAt.after?'after':'before'):'')+(drag===item.id?' dragging':'')}
        onDragOver={e=>{if(term||!drag||drag===item.id)return;e.preventDefault();e.dataTransfer.dropEffect='move';const rect=e.currentTarget.getBoundingClientRect();setDropAt({id:item.id,after:e.clientY>rect.top+rect.height/2});}}
        onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setDropAt(null);}}
        onDrop={e=>{e.preventDefault();if(drag&&dropAt?.id===item.id)void reorder(drag,item.id,dropAt.after);setDrag(null);setDropAt(null);}}>
        {!term&&<span draggable title="메모 순서 이동" className="bundle-grip"
          onDragStart={e=>{setDrag(item.id);e.dataTransfer.effectAllowed='move';}} onDragEnd={()=>{setDrag(null);setDropAt(null);}}><GripVertical size={14}/></span>}
        <button className="bundle-list-select" onClick={()=>select(item.id)}>
          <strong>{item.title||'제목 없음'}</strong>{term&&<small>{highlightedExcerpt(item.preview||'',term.trim())}</small>}
        </button>
        <button className="icon-button subtle" aria-label="메모 삭제" onClick={()=>void trash(item.id)}><Trash2 size={14}/></button>
      </div>)}</div>
    </aside>
    <section className="bundle-document">
      {note&&active===note.id?<><div className="bundle-doc-header">
        <input aria-label="메모 제목" value={note.title} onChange={e=>{revision.current+=1;dirty.current=true;setNote({...note,title:e.target.value});}}
          onBlur={()=>void persist(note)}/>
        <span>{busy?'저장 중':error?'저장 오류':'자동 저장'}</span>
      </div>
        <RichTextEditor key={note.id} html={note.document.html||''}
          className="bundle-rich-editor"
          onChange={html=>{revision.current+=1;dirty.current=true;setNote(current=>current?{...current,document:{html}}:null);}}
          onBlur={()=>{if(dirty.current)void persist(note);}}
          onImage={addImage} resolveImage={resolveImage} serialize={serializeRichHtml}/>
      </>:<p className="bundle-empty">왼쪽에서 메모를 선택하거나 새로 추가하세요.</p>}
      {error&&<p role="alert" className="bundle-error">{error}</p>}
    </section>
  </div>;
}
