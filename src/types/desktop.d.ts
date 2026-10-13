import type { DashboardState } from './dashboard';

declare global {
  interface Window {
    dashboardDesktop?: {
      loadState(): Promise<DashboardState | null>;
      saveState(state: DashboardState): Promise<boolean>;
      backup(): Promise<string>;
      restoreBackup(): Promise<boolean>;
      listNotes(cardId: string): Promise<unknown[]>;
      reorderNotes(cardId:string, ids:string[]): Promise<boolean>;
      getNote(id: string): Promise<unknown>;
      saveNote(note: unknown): Promise<boolean>;
      searchNotes(cardId: string, query: string, field: string): Promise<unknown[]>;
      trashNote(id: string, title: string): Promise<boolean>;
      listTrash(): Promise<unknown[]>;
      trashCardNotes(cardId:string,title:string): Promise<number>;
      restoreNotes(items: {id: string; cardId?: string}[]): Promise<number>;
      permanentlyDeleteNotes(ids: string[]): Promise<number>;
      saveAttachment(id: string, mimeType: string, bytes: number[]): Promise<boolean>;
      getAttachment(id: string): Promise<{mimeType: string; bytes: number[]} | null>;
    };
  }
}
export {};
