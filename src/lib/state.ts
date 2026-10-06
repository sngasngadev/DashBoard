import type { CardRecord, CardType, DashboardState, MemoBoardData, MemoData, TodoData } from '../types/dashboard';
import { makeId } from './id';
import { nextCardPosition } from './layout';

const now = () => new Date().toISOString();

const defaults: Record<CardType, { title: string; w: number; h: number }> = {
  todo: { title: '할 일', w: 4, h: 7 },
  memo: { title: '자유메모', w: 4, h: 7 },
  memoBoard: { title: '메모보드', w: 5, h: 8 }
};

function initialData(type: CardType): TodoData | MemoData | MemoBoardData {
  if (type === 'todo') return { items: [], completedCollapsed: false };
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
    settings: { autoCompact: true },
    cards: [first, second]
  };
}

export function normalizeState(raw: unknown): DashboardState {
  if (!raw || typeof raw !== 'object') return createInitialState();
  const candidate = raw as Partial<DashboardState>;
  if (candidate.version !== 1 || !Array.isArray(candidate.cards)) return createInitialState();
  return {
    version: 1,
    meta: {
      title: candidate.meta?.title || '나의 대시보드',
      description: candidate.meta?.description || ''
    },
    settings: { autoCompact: candidate.settings?.autoCompact ?? true },
    cards: candidate.cards.filter(Boolean).map(card => ({
      ...card,
      favorite: Boolean(card.favorite),
      updatedAt: card.updatedAt || now(),
      createdAt: card.createdAt || now()
    }))
  } as DashboardState;
}
