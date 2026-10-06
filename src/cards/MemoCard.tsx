import { Bold, Italic, Underline } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { MemoData } from '../types/dashboard';

function command(name: string, value?: string) {
  document.execCommand(name, false, value);
}

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

  return <div className="rich-memo">
    <div className="editor-toolbar">
      <button className="icon-button" aria-label="굵게" onMouseDown={e => { e.preventDefault(); command('bold'); }}><Bold size={17}/></button>
      <button className="icon-button" aria-label="기울임" onMouseDown={e => { e.preventDefault(); command('italic'); }}><Italic size={17}/></button>
      <button className="icon-button" aria-label="밑줄" onMouseDown={e => { e.preventDefault(); command('underline'); }}><Underline size={17}/></button>
      <select aria-label="글꼴" defaultValue="Arial" onChange={e => command('fontName', e.target.value)}>
        <option value="Arial">기본</option><option value="Malgun Gothic">맑은 고딕</option><option value="Georgia">Georgia</option><option value="monospace">고정폭</option>
      </select>
      <select aria-label="글자 크기" defaultValue="3" onChange={e => command('fontSize', e.target.value)}>
        <option value="2">작게</option><option value="3">보통</option><option value="4">크게</option><option value="5">더 크게</option>
      </select>
      <label className="color-control" title="글자 색"><span>글자색</span><input type="color" onChange={e => command('foreColor', e.target.value)} /></label>
    </div>
    <EditableMemo
      html={data.html}
      className="rich-editor"
      placeholder="메모를 입력하세요."
      onChange={changeHtml}
    />
  </div>;
}
