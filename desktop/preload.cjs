'use strict';
const { contextBridge, ipcRenderer } = require('electron');
const invoke = (channel,...args) => ipcRenderer.invoke(channel,...args);
contextBridge.exposeInMainWorld('dashboardDesktop',{
  loadState:()=>invoke('dashboard:load'),
  saveState:state=>invoke('dashboard:save',state),
  backup:()=>invoke('dashboard:backup'),
  listNotes:cardId=>invoke('notes:list',cardId),
  reorderNotes:(cardId,ids)=>invoke('notes:reorder',cardId,ids),
  getNote:id=>invoke('notes:get',id),
  saveNote:note=>invoke('notes:save',note),
  searchNotes:(cardId,query,field)=>invoke('notes:search',cardId,query,field),
  trashNote:(id,title)=>invoke('notes:trash',id,title),
  listTrash:()=>invoke('notes:trash-list'),
  trashCardNotes:(cardId,title)=>invoke('notes:trash-card',cardId,title),
  restoreNotes:items=>invoke('notes:restore',items),
  permanentlyDeleteNotes:ids=>invoke('notes:delete',ids),
  saveAttachment:(id,mimeType,bytes)=>invoke('attachments:save',id,mimeType,bytes),
  getAttachment:id=>invoke('attachments:get',id)
});
