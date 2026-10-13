import { useEffect, useRef } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TableKit } from '@tiptap/extension-table';
import Image from '@tiptap/extension-image';
import { TextStyleKit } from '@tiptap/extension-text-style';
import TextAlign from '@tiptap/extension-text-align';

type Props={html:string;onChange:(html:string)=>void;onBlur?:()=>void;onImage?:(file:File)=>Promise<{src:string;attachmentId?:string}>;className?:string};
const AttachmentImage=Image.extend({
  addAttributes(){
    return {...this.parent?.(), attachmentId:{
      default:null,
      parseHTML:(element:HTMLElement)=>element.getAttribute('data-attachment-id'),
      renderHTML:(attributes:Record<string,unknown>)=>attributes.attachmentId?{'data-attachment-id':String(attributes.attachmentId)}:{}
    }};
  }
}).configure({resize:{enabled:true,minWidth:60,minHeight:60,alwaysPreserveAspectRatio:true}});
const extensions=[
  StarterKit,TableKit.configure({table:{resizable:true}}),
  AttachmentImage,TextStyleKit,
  TextAlign.configure({types:['heading','paragraph']})
];
export function RichTextEditor({html,onChange,onBlur,onImage,className}:Props){
  const callback=useRef(onChange),blur=useRef(onBlur),image=useRef(onImage);
  callback.current=onChange;blur.current=onBlur;image.current=onImage;
  const editor=useEditor({
    extensions, content:html||'<p></p>',
    onUpdate:({editor})=>callback.current(editor.getHTML()),
    onBlur:()=>blur.current?.(),
    editorProps:{
      handlePaste(view,event){
        const item=[...(event.clipboardData?.items||[])].find(item=>item.kind==='file'&&item.type.startsWith('image/'));
        const file=item?.getAsFile();
        if(!file||!image.current)return false;
        event.preventDefault();
        const position=view.state.selection.from;
        void image.current(file).then(({src,attachmentId})=>{
          const node=view.state.schema.nodes.image.create({src,attachmentId});
          const tr=view.state.tr.insert(position,node);
          view.dispatch(tr);
        }).catch(error=>window.alert('이미지 붙여넣기 실패: '+String(error)));
        return true;
      }
    }
  });
  useEffect(()=>{
    if(!editor||editor.isDestroyed)return;
    if(editor.getHTML()!==(html||'<p></p>'))editor.commands.setContent(html||'<p></p>',{emitUpdate:false});
  },[editor,html]);
  if(!editor)return <div aria-label="편집기 불러오는 중" />;
  const action=(label:string,run:()=>void)=><button type="button" onMouseDown={e=>e.preventDefault()} onClick={run}>{label}</button>;
  return <div className={'advanced-editor '+(className||'')}>
    <div className="advanced-toolbar" role="toolbar" aria-label="문서 서식">
      {action('굵게',()=>editor.chain().focus().toggleBold().run())}
      {action('기울임',()=>editor.chain().focus().toggleItalic().run())}
      {action('밑줄',()=>editor.chain().focus().toggleUnderline().run())}
      {action('취소선',()=>editor.chain().focus().toggleStrike().run())}
      {action('제목',()=>editor.chain().focus().toggleHeading({level:2}).run())}
      {action('목록',()=>editor.chain().focus().toggleBulletList().run())}
      {action('번호',()=>editor.chain().focus().toggleOrderedList().run())}
      {action('왼쪽',()=>editor.chain().focus().setTextAlign('left').run())}
      {action('가운데',()=>editor.chain().focus().setTextAlign('center').run())}
      {action('오른쪽',()=>editor.chain().focus().setTextAlign('right').run())}
      {action('표',()=>editor.chain().focus().insertTable({rows:3,cols:3,withHeaderRow:false}).run())}
      {action('행 추가',()=>editor.chain().focus().addRowAfter().run())}
      {action('열 추가',()=>editor.chain().focus().addColumnAfter().run())}
      {action('행 삭제',()=>editor.chain().focus().deleteRow().run())}
      {action('열 삭제',()=>editor.chain().focus().deleteColumn().run())}
      {action('실행 취소',()=>editor.chain().focus().undo().run())}
      <select aria-label="글꼴" defaultValue="" onChange={e=>editor.chain().focus().setFontFamily(e.target.value).run()}>
        <option value="">글꼴</option><option value="Malgun Gothic">맑은 고딕</option><option value="Arial">Arial</option><option value="Georgia">Georgia</option><option value="monospace">고정폭</option>
      </select>
      <select aria-label="글자 크기" defaultValue="" onChange={e=>editor.chain().focus().setFontSize(e.target.value).run()}>
        <option value="">크기</option>{[12,14,16,18,24,30].map(n=><option key={n} value={n+'px'}>{n}px</option>)}
      </select>
      <label>글자색 <input type="color" onChange={e=>editor.chain().focus().setColor(e.target.value).run()}/></label>
      <label>배경색 <input type="color" onChange={e=>editor.chain().focus().setBackgroundColor(e.target.value).run()}/></label>
    </div>
    <EditorContent editor={editor} className="advanced-content"/>
  </div>;
}
