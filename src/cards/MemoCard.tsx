import { Bold, Italic, Underline } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { MemoData } from '../types/dashboard';

function htmlToText(html: string) {
  const root = document.createElement('div');
  root.innerHTML = html;

  const read = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
    if (!(node instanceof HTMLElement)) return '';

    if (node.tagName === 'BR') return '\n';

    const block = node.tagName === 'DIV' || node.tagName === 'P';
    const content = Array.from(node.childNodes).map(read).join('');
    if (!block) return content;
    return content.endsWith('\n') ? content : content + '\n';
  };

  return Array.from(root.childNodes).map(read).join('').replace(/\n$/, '');
}

function escapeHtml(text: string) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function textToHtml(text: string) {
  return text
    .split('\n')
    .map(line => `<div>${line ? escapeHtml(line) : '<br>'}</div>`)
    .join('');
}

function command(name: string, value?: string) {
  document.execCommand(name, false, value);
}

export function MemoCard({ data, onChange, detail = false }: { data: MemoData; onChange: (data: MemoData) => void; detail?: boolean }) {
  const editor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (detail && editor.current && editor.current.innerHTML !== data.html) {
      editor.current.innerHTML = data.html;
    }
  }, [data.html, detail]);

  if (!detail) {
    return <textarea
      className="simple-memo"
      placeholder="메모를 입력하세요."
      value={htmlToText(data.html)}
      onChange={e => onChange({ html: textToHtml(e.target.value) })}
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
    <div
      ref={editor}
      className="rich-editor"
      contentEditable
      suppressContentEditableWarning
      data-placeholder="메모를 입력하세요."
      onInput={e => onChange({ html: e.currentTarget.innerHTML })}
    />
  </div>;
}
