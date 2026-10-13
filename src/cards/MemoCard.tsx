import { RichTextEditor } from '../components/RichTextEditor';
import { useEffect, useRef } from 'react';
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

  if (!detail) {
    return <EditableMemo
      html={data.html}
      className="simple-memo"
      placeholder="메모를 입력하세요."
      onChange={changeHtml}
    />;
  }

  return <RichTextEditor html={data.html} onChange={changeHtml} className="rich-memo" />;
}
