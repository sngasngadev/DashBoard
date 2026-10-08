import type { CardType } from '../types/dashboard';

export const CARD_TYPES: Array<{ type: CardType; label: string; description: string }> = [
  { type: 'todo', label: 'ToDo', description: '할 일과 완료 항목을 관리합니다.' },
  { type: 'schedule', label: '일정', description: '날짜별 일정을 관리하고 임박·지연 일정을 강조합니다.' },
  { type: 'memo', label: '자유메모', description: '긴 글을 자유롭게 작성합니다.' },
  { type: 'memoBoard', label: '메모보드', description: '여러 장의 포스트잇을 붙여 관리합니다.' }
];
