export type CardType = 'todo' | 'memo' | 'memoBoard';

export interface CardLayout {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TodoItem {
  id: string;
  text: string;
  done: boolean;
  createdAt: string;
}

export interface TodoData {
  items: TodoItem[];
  completedCollapsed: boolean;
}

export interface MemoData {
  html: string;
}

export type NoteColor = 'yellow' | 'pink' | 'blue' | 'green' | 'lavender';

export interface BoardNote {
  id: string;
  text: string;
  color: NoteColor;
}

export interface MemoBoardData {
  notes: BoardNote[];
}

export interface CardRecord {
  id: string;
  type: CardType | string;
  title: string;
  favorite: boolean;
  layout: CardLayout;
  data: TodoData | MemoData | MemoBoardData | Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardState {
  version: 1;
  meta: {
    title: string;
    description: string;
  };
  settings: {
    autoCompact: boolean;
    addTileLayout: CardLayout;
  };
  cards: CardRecord[];
}
