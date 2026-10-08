import type { BoardNote, CardLayout, CardRecord, CardType, DashboardState, MemoBoardData, MemoData, ScheduleData, ScheduleItem, TodoData, TodoItem } from '../types/dashboard';
import { makeId } from './id';
import { ADD_TILE_HEIGHT, ADD_TILE_WIDTH, GRID_COLS, nextCardPosition, repairOverlaps, safeAddTilePosition } from './layout';
import { clampPostitHeight, clampPostitWidth, POSTIT_COLORS } from './postit';
import { isDateValue } from './schedule';

const now = () => new Date().toISOString();

const defaults: Record<CardType, { title: string; w: number; h: number }> = {
  todo: { title: '할 일', w: 4, h: 7 },
  schedule: { title: '일정', w: 5, h: 7 },
  memo: { title: '자유메모', w: 4, h: 7 },
  memoBoard: { title: '메모보드', w: 5, h: 8 }
};

function initialData(type: CardType): TodoData | ScheduleData | MemoData | MemoBoardData {
  if (type === 'todo') return { items: [], completedCollapsed: false, draft: '' };
  if (type === 'schedule') return { items: [], completedCollapsed: true, draftDate: '', draftText: '' };
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
    settings: { autoCompact: true, addTileLayout: nextCardPosition([first, second], ADD_TILE_WIDTH, ADD_TILE_HEIGHT) },
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
  const seen = new Set<string>();
  const items: TodoItem[] = Array.isArray(raw.items) ? raw.items.flatMap((item): TodoItem[] => {
    if (!isObject(item)) return [];
    let id = str(item.id, makeId('todo'));
    if (seen.has(id)) id = makeId('todo');
    seen.add(id);
    return [{
      id,
      text: str(item.text),
      done: Boolean(item.done),
      createdAt: str(item.createdAt, now())
    }];
  }) : [];
  return { items, completedCollapsed: Boolean(raw.completedCollapsed), draft: str(raw.draft) };
}

function normalizeSchedule(value: unknown): ScheduleData {
  const raw = isObject(value) ? value : {};
  const seen = new Set<string>();
  const items: ScheduleItem[] = Array.isArray(raw.items) ? raw.items.flatMap((item): ScheduleItem[] => {
    if (!isObject(item)) return [];
    const date = str(item.date);
    if (!isDateValue(date)) return [];
    let id = str(item.id, makeId('schedule'));
    if (seen.has(id)) id = makeId('schedule');
    seen.add(id);
    return [{
      id,
      date,
      text: str(item.text),
      done: Boolean(item.done),
      createdAt: str(item.createdAt, now())
    }];
  }) : [];

  return {
    items,
    completedCollapsed: raw.completedCollapsed === undefined ? true : Boolean(raw.completedCollapsed),
    draftDate: isDateValue(str(raw.draftDate)) ? str(raw.draftDate) : '',
    draftText: str(raw.draftText)
  };
}

function normalizeMemo(value: unknown): MemoData {
  const raw = isObject(value) ? value : {};
  return { html: str(raw.html) };
}

function normalizeBoard(value: unknown): MemoBoardData {
  const raw = isObject(value) ? value : {};
  const seen = new Set<string>();
  const notes: BoardNote[] = Array.isArray(raw.notes) ? raw.notes.flatMap((note): BoardNote[] => {
    if (!isObject(note)) return [];
    const color = POSTIT_COLORS.includes(note.color as typeof POSTIT_COLORS[number]) ? note.color as typeof POSTIT_COLORS[number] : 'yellow';
    let id = str(note.id, makeId('note'));
    if (seen.has(id)) id = makeId('note');
    seen.add(id);
    return [{
      id,
      text: str(note.text),
      color,
      width: typeof note.width === 'number' && Number.isFinite(note.width) ? clampPostitWidth(note.width) : undefined,
      height: typeof note.height === 'number' && Number.isFinite(note.height) ? clampPostitHeight(note.height) : undefined
    }];
  }) : [];
  return { notes };
}

function normalizeCard(value: unknown): CardRecord | null {
  if (!isObject(value)) return null;
  const type = str(value.type, 'unknown');
  const data =
    type === 'todo' ? normalizeTodo(value.data) :
    type === 'schedule' ? normalizeSchedule(value.data) :
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
    : nextCardPosition(cards, ADD_TILE_WIDTH, ADD_TILE_HEIGHT);
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
