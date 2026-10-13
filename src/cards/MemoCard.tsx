import { RichTextEditor } from '../components/RichTextEditor';
import { useCallback, useEffect, useRef } from 'react';
import { makeId } from '../lib/id';
import { serializeRichHtml, textFromRichHtml } from '../lib/richHtml';
import type { MemoData } from '../types/dashboard';

function EditableMemo({ html, className, placeholder, onChange }: {
  html: string;
  className: string;
  placeholder: string;
  onChange: (html: string) => void;
}) {
  const editor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editor.current && editor.current.innerHTML !== html) {
      editor.current.innerHTML = html;
    }
  }, [html]);

  return <div
    ref={editor}
    className={className}
    contentEditable
    suppressContentEditableWarning
    data-placeholder={placeholder}
    onInput={e => onChange(e.currentTarget.innerHTML)}
  />;
}

export function MemoCard({ data, onChange, detail = false }: { data: MemoData; onChange: (data: MemoData) => void; detail?: boolean }) {
  const changeHtml = (html: string) => onChange({ html });
  const addImage = useCallback(async (file: File) => {
    if (!window.dashboardDesktop) throw new Error('이미지 첨부는 데스크톱 앱에서만 가능합니다.');
    const id=makeId('attachment');
    await window.dashboardDesktop.saveAttachment(id,file.type,Array.from(new Uint8Array(await file.arrayBuffer())));
    return {src:URL.createObjectURL(file),attachmentId:id};
  },[]);
  const resolveImage = useCallback(async (id:string)=>{
    const item=await window.dashboardDesktop?.getAttachment(id);
    if(!item)throw new Error('이미지를 찾을 수 없습니다.');
    return URL.createObjectURL(new Blob([new Uint8Array(item.bytes)],{type:item.mimeType}));
  },[]);

  if (!detail && data.html.includes('data-attachment-id=')) {
    return <div className="simple-memo memo-with-images"><p>{textFromRichHtml(data.html)||'이미지가 포함된 메모'}</p><small>이미지 포함 문서는 상세 탭에서 편집하세요.</small></div>;
  }
  if (!detail) {
    return <EditableMemo
      html={data.html}
      className="simple-memo"
      placeholder="메모를 입력하세요."
      onChange={changeHtml}
    />;
  }

  return <RichTextEditor html={data.html} onChange={changeHtml} className="rich-memo" onImage={addImage} resolveImage={resolveImage} serialize={serializeRichHtml} />;
}
