import { useEffect, useRef } from 'react';
import { Bold, Italic, Underline, Strikethrough, Heading2, List, ListOrdered, AlignLeft, AlignCenter, AlignRight, Table2, Rows3, Columns3, Undo2, Trash2, PaintBucket, Baseline } from 'lucide-react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TableKit } from '@tiptap/extension-table';
import Image from '@tiptap/extension-image';
import { TextStyleKit } from '@tiptap/extension-text-style';
import TextAlign from '@tiptap/extension-text-align';

type Props={html:string;onChange:(html:string)=>void;onBlur?:()=>void;onImage?:(file:File)=>Promise<{src:string;attachmentId?:string}>;resolveImage?:(id:string)=>Promise<string>;serialize?:(html:string)=>string;className?:string};
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
export function RichTextEditor({html,onChange,onBlur,onImage,resolveImage,serialize,className}:Props){
  const callback=useRef(onChange),blur=useRef(onBlur),image=useRef(onImage);
  callback.current=onChange;blur.current=onBlur;image.current=onImage;
  const serializer=useRef(serialize),lastEmitted=useRef<string|null>(null);
  serializer.current=serialize;
  const resolved=useRef(new Set<string>());
  const urls=useRef<string[]>([]);
  const editor=useEditor({
    extensions, content:html||'<p></p>',
    onUpdate:({editor})=>{
      const html=editor.getHTML();
      const value=serializer.current?serializer.current(html):html;
      lastEmitted.current=value;
      callback.current(value);
    },
    onBlur:()=>blur.current?.(),
    editorProps:{
      handlePaste(view,event){
        const item=[...(event.clipboardData?.items||[])].find(item=>item.kind==='file'&&item.type.startsWith('image/'));
        const file=item?.getAsFile();
        if(!file||!image.current)return false;
        event.preventDefault();
        const position=view.state.selection.from;
        void image.current(file).then(({src,attachmentId})=>{
          if(src.startsWith('blob:'))urls.current.push(src);
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
    if(lastEmitted.current===html)return;
    if(editor.getHTML()!==(html||'<p></p>'))editor.commands.setContent(html||'<p></p>',{emitUpdate:false});
  },[editor,html]);
  useEffect(()=>{
    if(!editor||!resolveImage)return;
    editor.state.doc.descendants((node,pos)=>{
      if(node.type.name!=='image'||!node.attrs.attachmentId||resolved.current.has(node.attrs.attachmentId))return;
      const id=String(node.attrs.attachmentId);
      resolved.current.add(id);
      void resolveImage(id).then(src=>{
        if(editor.isDestroyed){URL.revokeObjectURL(src);return;}
        urls.current.push(src);
        const tr=editor.state.tr;
        let target=-1;
        editor.state.doc.descendants((candidate,at)=>{
          if(candidate.type.name==='image'&&candidate.attrs.attachmentId===id){target=at;return false;}
          return true;
        });
        if(target>=0){
          const item=editor.state.doc.nodeAt(target);
          if(item)editor.view.dispatch(tr.setNodeMarkup(target,undefined,{...item.attrs,src}));
        }
      }).catch(error=>{resolved.current.delete(id);console.error('Image hydration failed:',error);});
    });
    return()=>{urls.current.forEach(URL.revokeObjectURL);urls.current=[];resolved.current.clear();};
  },[editor,resolveImage]);
  useEffect(()=>()=>{urls.current.forEach(URL.revokeObjectURL);urls.current=[];},[]);
  if(!editor)return <div aria-label="편집기 불러오는 중" />;
  const action=(label:string,Icon:typeof Bold,run:()=>void,active=false)=>
    <button type="button" className={'editor-icon-button'+(active?' is-active':'')} aria-label={label} title={label}
      onMouseDown={e=>e.preventDefault()} onClick={run}><Icon size={17} strokeWidth={1.9}/></button>;
  return <div className={'advanced-editor '+(className||'')}>
    <div className="advanced-toolbar" role="toolbar" aria-label="문서 서식">
      <div className="editor-tool-group">
        {action('굵게',Bold,()=>editor.chain().focus().toggleBold().run(),editor.isActive('bold'))}
        {action('기울임',Italic,()=>editor.chain().focus().toggleItalic().run(),editor.isActive('italic'))}
        {action('밑줄',Underline,()=>editor.chain().focus().toggleUnderline().run(),editor.isActive('underline'))}
        {action('취소선',Strikethrough,()=>editor.chain().focus().toggleStrike().run(),editor.isActive('strike'))}
        {action('제목',Heading2,()=>editor.chain().focus().toggleHeading({level:2}).run(),editor.isActive('heading',{level:2}))}
      </div>
      <div className="editor-tool-group">
        {action('목록',List,()=>editor.chain().focus().toggleBulletList().run(),editor.isActive('bulletList'))}
        {action('번호',ListOrdered,()=>editor.chain().focus().toggleOrderedList().run(),editor.isActive('orderedList'))}
        {action('왼쪽',AlignLeft,()=>editor.chain().focus().setTextAlign('left').run())}
        {action('가운데',AlignCenter,()=>editor.chain().focus().setTextAlign('center').run())}
        {action('오른쪽',AlignRight,()=>editor.chain().focus().setTextAlign('right').run())}
      </div>
      <div className="editor-tool-group">
        {action('표',Table2,()=>editor.chain().focus().insertTable({rows:3,cols:3,withHeaderRow:false}).run())}
        {action('행 추가',Rows3,()=>editor.chain().focus().addRowAfter().run())}
        {action('열 추가',Columns3,()=>editor.chain().focus().addColumnAfter().run())}
        {action('행 삭제',Trash2,()=>editor.chain().focus().deleteRow().run())}
        {action('열 삭제',Trash2,()=>editor.chain().focus().deleteColumn().run())}
        {action('실행 취소',Undo2,()=>editor.chain().focus().undo().run())}
      </div>
      <select aria-label="글꼴" defaultValue="" onChange={e=>editor.chain().focus().setFontFamily(e.target.value).run()}>
        <option value="">글꼴</option><option value="Malgun Gothic">맑은 고딕</option><option value="Arial">Arial</option><option value="Georgia">Georgia</option><option value="monospace">고정폭</option>
      </select>
      <select aria-label="글자 크기" defaultValue="" onChange={e=>editor.chain().focus().setFontSize(e.target.value).run()}>
        <option value="">크기</option>{[12,14,16,18,24,30].map(n=><option key={n} value={n+'px'}>{n}px</option>)}
      </select>
      <label className="editor-color-picker" title="글자색"><Baseline size={17}/><input aria-label="글자색" type="color" onChange={e=>editor.chain().focus().setColor(e.target.value).run()}/></label>
      <label className="editor-color-picker" title="배경색"><PaintBucket size={17}/><input aria-label="배경색" type="color" onChange={e=>editor.chain().focus().setBackgroundColor(e.target.value).run()}/></label>
    </div>
    <EditorContent editor={editor} className="advanced-content"/>
  </div>;
}
