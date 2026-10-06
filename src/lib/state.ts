import type { BoardNote, CardLayout, CardRecord, CardType, DashboardState, MemoBoardData, MemoData, NoteColor, TodoData, TodoItem } from '../types/dashboard';
import { makeId } from './id';
import { GRID_COLS, nextCardPosition, repairOverlaps, safeAddTilePosition } from './layout';

const now = () => new Date().toISOString();

const defaults: Record<CardType, { title: string; w: number; h: number }> = {
  todo: { title: '할 일', w: 4, h: 7 },
  memo: { title: '자유메모', w: 4, h: 7 },
  memoBoard: { title: '메모보드', w: 5, h: 8 }
};

function initialData(type: CardType): TodoData | MemoData | MemoBoardData {
  if (type === 'todo') return { items: [], completedCollapsed: false, draft: '' };
  if (type === 'memo') return { html: '' };
  return { notes: [] };
}

export function createCard(type: CardType, cards: CardRecord[]): CardRecord {
  const def = defaults[type];
  const timestamp = now();
  return {
    id: makeId('card'),
    type,
    title: def.title,
    favorite: false,
    layout: nextCardPosition(cards, def.w, def.h),
    data: initialData(type),
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

export function createInitialState(): DashboardState {
  const first = createCard('todo', []);
  const second = createCard('memo', [first]);
  return {
    version: 1,
    meta: { title: '나의 대시보드', description: '필요한 정보와 할 일을 한 화면에서 관리하세요.' },
    settings: { autoCompact: true, addTileLayout: nextCardPosition([first, second], 3, 3) },
    cards: [first, second]
  };
}

const isObject = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const str = (value: unknown, fallback = '') => typeof value === 'string' ? value : fallback;
const finite = (value: unknown, fallback: number) => typeof value === 'number' && Number.isFinite(value) ? value : fallback;

function normalizeLayout(value: unknown): CardLayout {
  const raw = isObject(value) ? value : {};
  const w = Math.max(3, Math.min(GRID_COLS, Math.round(finite(raw.w, 4))));
  const h = Math.max(4, Math.round(finite(raw.h, 7)));
  return {
    x: Math.max(0, Math.min(GRID_COLS - w, Math.round(finite(raw.x, 0)))),
    y: Math.max(0, Math.round(finite(raw.y, 0))),
    w,
    h
  };
}

function normalizeTodo(value: unknown): TodoData {
  const raw = isObject(value) ? value : {};
  const items: TodoItem[] = Array.isArray(raw.items) ? raw.items.flatMap((item): TodoItem[] => {
    if (!isObject(item)) return [];
    return [{
      id: str(item.id, makeId('todo')),
      text: str(item.text),
      done: Boolean(item.done),
      createdAt: str(item.createdAt, now())
    }];
  }) : [];
  return { items, completedCollapsed: Boolean(raw.completedCollapsed), draft: str(raw.draft) };
}

function normalizeMemo(value: unknown): MemoData {
  const raw = isObject(value) ? value : {};
  return { html: str(raw.html) };
}

const noteColors: NoteColor[] = ['yellow', 'pink', 'blue', 'green', 'lavender'];
function normalizeBoard(value: unknown): MemoBoardData {
  const raw = isObject(value) ? value : {};
  const notes: BoardNote[] = Array.isArray(raw.notes) ? raw.notes.flatMap((note): BoardNote[] => {
    if (!isObject(note)) return [];
    const color = noteColors.includes(note.color as NoteColor) ? note.color as NoteColor : 'yellow';
    return [{
      id: str(note.id, makeId('note')),
      text: str(note.text),
      color,
      width: typeof note.width === 'number' && Number.isFinite(note.width) ? Math.max(180, Math.min(600, Math.round(note.width))) : undefined,
      height: typeof note.height === 'number' && Number.isFinite(note.height) ? Math.max(140, Math.min(500, Math.round(note.height))) : undefined
    }];
  }) : [];
  return { notes };
}

function normalizeCard(value: unknown): CardRecord | null {
  if (!isObject(value)) return null;
  const type = str(value.type, 'unknown');
  const data =
    type === 'todo' ? normalizeTodo(value.data) :
    type === 'memo' ? normalizeMemo(value.data) :
    type === 'memoBoard' ? normalizeBoard(value.data) :
    isObject(value.data) ? value.data : {};

  return {
    id: str(value.id, makeId('card')),
    type,
    title: str(value.title, '제목 없음'),
    favorite: Boolean(value.favorite),
    layout: normalizeLayout(value.layout),
    data,
    createdAt: str(value.createdAt, now()),
    updatedAt: str(value.updatedAt, now())
  };
}

export function normalizeState(raw: unknown): DashboardState {
  if (!isObject(raw) || raw.version !== 1 || !Array.isArray(raw.cards)) return createInitialState();

  const seen = new Set<string>();
  const normalizedCards = raw.cards.flatMap((value): CardRecord[] => {
    const card = normalizeCard(value);
    if (!card) return [];
    if (seen.has(card.id)) card.id = makeId('card');
    seen.add(card.id);
    return [card];
  });

  const cards = repairOverlaps(normalizedCards);
  const meta = isObject(raw.meta) ? raw.meta : {};
  const settings = isObject(raw.settings) ? raw.settings : {};
  const rawAddTile = isObject(settings.addTileLayout)
    ? normalizeLayout(settings.addTileLayout)
    : nextCardPosition(cards, 3, 3);
  const addTileLayout = safeAddTilePosition(cards, rawAddTile);

  return {
    version: 1,
    meta: {
      title: str(meta.title, '나의 대시보드') || '나의 대시보드',
      description: str(meta.description)
    },
    settings: {
      autoCompact: settings.autoCompact === undefined ? true : Boolean(settings.autoCompact),
      addTileLayout
    },
    cards
  };
}
