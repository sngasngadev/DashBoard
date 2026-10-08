export type CardType = 'todo' | 'schedule' | 'memo' | 'memoBoard';

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
  draft: string;
}

export interface ScheduleItem {
  id: string;
  date: string;
  text: string;
  done: boolean;
  createdAt: string;
}

export interface ScheduleData {
  items: ScheduleItem[];
  completedCollapsed: boolean;
  draftDate: string;
  draftText: string;
}

export interface MemoData {
  html: string;
}

export type NoteColor = 'yellow' | 'pink' | 'blue' | 'green' | 'lavender';

export interface BoardNote {
  id: string;
  text: string;
  color: NoteColor;
  width?: number;
  height?: number;
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
  data: TodoData | ScheduleData | MemoData | MemoBoardData | Record<string, unknown>;
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
