/** Strip short-lived blob URLs from persisted HTML, keep SQLite attachment IDs. */
export function serializeRichHtml(html:string):string {
  const root=document.createElement('div');
  root.innerHTML=html;
  root.querySelectorAll<HTMLImageElement>('img[data-attachment-id]').forEach(img=>{
    if(img.dataset.attachmentId)img.setAttribute('src','attachment://'+img.dataset.attachmentId);
  });
  return root.innerHTML;
}
export function textFromRichHtml(html:string):string {
  const root=document.createElement('div');
  root.innerHTML=html;
  return root.textContent||'';
}
