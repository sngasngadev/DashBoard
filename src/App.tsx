import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import GridLayout, { type Layout } from 'react-grid-layout';
import { GripVertical, Plus, Settings } from 'lucide-react';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import './styles.css';
import type { BoardNote, CardRecord, CardType, DashboardState, MemoBoardData, MemoData, TodoData, TodoItem } from './types/dashboard';
import { loadState, saveState, exportBackup, importBackupWeb } from './lib/storage';
import { compactCards, GRID_COLS, nextCardPosition, pushCardsFromDrop, reorderAndCompactCards, repairOverlaps, safeAddTilePosition } from './lib/layout';
import { createCard, createInitialState } from './lib/state';
import { AddCardModal } from './components/AddCardModal';
import { SettingsModal } from './components/SettingsModal';
import { ConfirmDialog } from './components/ConfirmDialog';
import { CardShell } from './components/CardShell';
import { TodoCard } from './cards/TodoCard';
import { MemoCard } from './cards/MemoCard';
import { MemoBoardCard } from './cards/MemoBoardCard';

const ADD_ID = '__add_card__';

type ConfirmState = null | { title: string; message: string; action: () => void; confirmLabel?: string };

function useContainerWidth(ref: React.RefObject<HTMLDivElement | null>, enabled: boolean) {
  const [width, setWidth] = useState<number | null>(null);
  useEffect(() => {
    if (!enabled || !ref.current) return;
    setWidth(ref.current.getBoundingClientRect().width);
    const observer = new ResizeObserver(entries => setWidth(entries[0].contentRect.width));
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref, enabled]);
  return width;
}

export default function App() {
  const [state, setState] = useState<DashboardState>(() => createInitialState());
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<string>('main');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const gridRef = useRef<HTMLDivElement>(null);
  const width = useContainerWidth(gridRef, loaded);
  const mobile = width !== null && width < 760;

  useEffect(() => {
    loadState().then(value => { setState(value); setLoaded(true); });
  }, []);

  useEffect(() => {
    if (!loaded) return;
    setSaveStatus('saving');
    const id = window.setTimeout(() => saveState(state).finally(() => setSaveStatus('saved')), 350);
    return () => window.clearTimeout(id);
  }, [state, loaded]);

  useEffect(() => {
    if (selected !== 'main' && !state.cards.some(card => card.id === selected)) setSelected('main');
  }, [selected, state.cards]);

  const updateCard = useCallback((id: string, patch: Partial<CardRecord>) => {
    setState(prev => ({ ...prev, cards: prev.cards.map(card => card.id === id ? { ...card, ...patch, updatedAt: new Date().toISOString() } : card) }));
  }, []);

  const updateData = useCallback((id: string, data: CardRecord['data']) => updateCard(id, { data }), [updateCard]);

  const askCardDelete = (card: CardRecord) => {
    if (card.favorite) return;
    setConfirm({ title: '카드를 삭제할까요?', message: `“${card.title || '제목 없음'}” 카드와 카드 안의 내용이 함께 삭제됩니다.`, action: () => setState(prev => {
      const cards = prev.cards.filter(item => item.id !== card.id);
      return { ...prev, cards: prev.settings.autoCompact ? compactCards(cards) : cards };
    }) });
  };

  const addCard = (type: CardType) => {
    setState(prev => {
      let cards = [...prev.cards, createCard(type, prev.cards)];
      if (prev.settings.autoCompact) cards = compactCards(cards);
      return {
        ...prev,
        cards,
        settings: { ...prev.settings, addTileLayout: nextCardPosition(cards, 3, 3) }
      };
    });
    setAddOpen(false);
  };

  const layouts: Layout[] = useMemo(() => {
    const base = state.cards.map(card => ({ i: card.id, ...card.layout, minW: 3, minH: 4 }));
    return [...base, { i: ADD_ID, ...state.settings.addTileLayout, minW: 3, minH: 3, maxW: 3, maxH: 3 }];
  }, [state.cards, state.settings.addTileLayout]);

  const applyDragStop = (layout: Layout[], movedId: string, target: Layout) => {
    setState(prev => {
      const add = layout.find(item => item.i === ADD_ID);
      let addTileLayout = add
        ? { x: add.x, y: add.y, w: 3, h: 3 }
        : prev.settings.addTileLayout;

      if (movedId === ADD_ID) {
        addTileLayout = safeAddTilePosition(prev.cards, addTileLayout);
        return { ...prev, settings: { ...prev.settings, addTileLayout } };
      }

      if (prev.settings.autoCompact) {
        const cards = reorderAndCompactCards(prev.cards, movedId, target);
        addTileLayout = nextCardPosition(cards, 3, 3);
        return { ...prev, cards, settings: { ...prev.settings, addTileLayout } };
      }

      const moved = prev.cards.find(card => card.id === movedId);
      if (!moved) return prev;
      const cards = pushCardsFromDrop(prev.cards, movedId, { x: target.x, y: target.y, w: moved.layout.w, h: moved.layout.h });
      addTileLayout = safeAddTilePosition(cards, addTileLayout);
      return { ...prev, cards, settings: { ...prev.settings, addTileLayout } };
    });
  };

  const applyResizeStop = (layout: Layout[]) => {
    setState(prev => {
      let cards = repairOverlaps(prev.cards.map(card => {
        const next = layout.find(item => item.i === card.id);
        return next ? { ...card, layout: { x: next.x, y: next.y, w: next.w, h: next.h } } : card;
      }));
      if (prev.settings.autoCompact) cards = compactCards(cards);
      const preferredAdd = prev.settings.autoCompact ? nextCardPosition(cards, 3, 3) : prev.settings.addTileLayout;
      return {
        ...prev,
        cards,
        settings: { ...prev.settings, addTileLayout: safeAddTilePosition(cards, preferredAdd) }
      };
    });
  };

  const askTodoDelete = (card: CardRecord, item: TodoItem) => setConfirm({ title: '할 일을 삭제할까요?', message: item.text.split('\n')[0] || '이 항목을 삭제합니다.', action: () => {
    const data = card.data as TodoData;
    updateData(card.id, { ...data, items: data.items.filter(i => i.id !== item.id) });
  } });

  const askNoteDelete = (card: CardRecord, note: BoardNote) => setConfirm({ title: '포스트잇을 삭제할까요?', message: note.text.split('\n')[0] || '빈 포스트잇을 삭제합니다.', action: () => {
    const data = card.data as MemoBoardData;
    updateData(card.id, { ...data, notes: data.notes.filter(i => i.id !== note.id) });
  } });

  const renderContent = (card: CardRecord, detail = false) => {
    if (card.type === 'todo') return <TodoCard data={card.data as TodoData} detail={detail} onChange={data => updateData(card.id, data)} onAskDelete={item => askTodoDelete(card, item)} />;
    if (card.type === 'memo') return <MemoCard data={card.data as MemoData} detail={detail} onChange={data => updateData(card.id, data)} />;
    if (card.type === 'memoBoard') return <MemoBoardCard data={card.data as MemoBoardData} detail={detail} onChange={data => updateData(card.id, data)} onAskDelete={note => askNoteDelete(card, note)} />;
    return <div className="unsupported">지원되지 않는 카드 형식입니다.</div>;
  };

  const shell = (card: CardRecord, detail = false) => <CardShell key={card.id} card={card} detail={detail}
    onTitle={title => updateCard(card.id, { title })}
    onFavorite={() => updateCard(card.id, { favorite: !card.favorite })}
    onDelete={() => askCardDelete(card)}
    onOpenDetail={() => setSelected(card.id)}>
      {renderContent(card, detail)}
    </CardShell>;

  const doImport = async () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json,application/json';
    input.onchange = async () => {
      if (!input.files?.[0]) return;
      const imported = await importBackupWeb(input.files[0]);
      setConfirm({
        title: '백업을 불러올까요?',
        message: '현재 대시보드 내용과 배치가 백업 파일의 내용으로 바뀝니다.',
        confirmLabel: '불러오기',
        action: () => setState(imported)
      });
    };
    input.click();
  };

  const selectedCard = state.cards.find(card => card.id === selected);

  if (!loaded) return <div className="app-shell loading-shell" aria-label="대시보드 불러오는 중" />;

  return <div className="app-shell">
    <header className="top-header">
      <div className="title-block">
        <input className="dashboard-title" value={state.meta.title} onChange={e => setState(prev => ({ ...prev, meta: { ...prev.meta, title: e.target.value } }))} aria-label="대시보드 제목" />
        <textarea className="dashboard-description" rows={1} value={state.meta.description} onChange={e => setState(prev => ({ ...prev, meta: { ...prev.meta, description: e.target.value } }))} aria-label="대시보드 설명" />
      </div>
      <div className="header-actions"><span className={`save-status ${saveStatus}`}>{saveStatus === 'saving' ? '저장 중…' : '저장됨'}</span><button className="settings-button" onClick={() => setSettingsOpen(true)}><Settings size={18}/><span>설정</span></button></div>
    </header>

    <nav className="tabs" aria-label="대시보드 탭">
      <button className={selected === 'main' ? 'active' : ''} onClick={() => setSelected('main')}>메인</button>
      {state.cards.map(card => <button key={card.id} className={selected === card.id ? 'active' : ''} onClick={() => setSelected(card.id)}>{card.favorite && '★ '}{card.title || '제목 없음'}</button>)}
    </nav>

    <main className="workspace" ref={gridRef}>
      {width === null ? null : selected === 'main' ? (
        mobile ? <div className="mobile-card-stack">{state.cards.map(card => shell(card))}<button className="add-card-tile" onClick={() => setAddOpen(true)}><Plus size={24}/><strong>카드 추가</strong><span>필요한 카드를 더하세요</span></button></div>
        : <GridLayout className="layout" layout={layouts} cols={GRID_COLS} rowHeight={42} width={width} margin={[16, 16]} containerPadding={[0, 0]} draggableHandle=".drag-handle" draggableCancel="textarea, input, button:not(.drag-handle), select, [contenteditable='true']" preventCollision={false} allowOverlap compactType={null}
            onDragStop={(layout, _oldItem, newItem) => applyDragStop(layout, newItem.i, newItem)}
            onResizeStop={(layout) => applyResizeStop(layout)}>
            {state.cards.map(card => <div key={card.id}>{shell(card)}</div>)}
            <div key={ADD_ID} className="add-card-tile">
              <button className="add-card-drag-handle drag-handle" type="button" aria-label="카드 추가 타일 이동" title="잡고 이동"><GripVertical size={17}/></button>
              <button className="add-card-action" type="button" onClick={() => setAddOpen(true)}><Plus size={24}/><strong>카드 추가</strong><span>필요한 카드를 더하세요</span></button>
            </div>
          </GridLayout>
      ) : selectedCard ? <div className="detail-wrapper">{shell(selectedCard, true)}</div> : null}
    </main>

    <AddCardModal open={addOpen} onClose={() => setAddOpen(false)} onAdd={addCard} />
    <SettingsModal open={settingsOpen} autoCompact={state.settings.autoCompact} onClose={() => setSettingsOpen(false)}
      onToggleAuto={autoCompact => setState(prev => {
        const cards = autoCompact ? compactCards(prev.cards) : repairOverlaps(prev.cards);
        const preferredAdd = autoCompact ? nextCardPosition(cards, 3, 3) : prev.settings.addTileLayout;
        return { ...prev, settings: { ...prev.settings, autoCompact, addTileLayout: safeAddTilePosition(cards, preferredAdd) }, cards };
      })}
      onCompact={() => setState(prev => {
        const cards = compactCards(prev.cards);
        return { ...prev, cards, settings: { ...prev.settings, addTileLayout: safeAddTilePosition(cards, nextCardPosition(cards, 3, 3)) } };
      })}
      onExport={() => exportBackup(state)} onImport={doImport} />
    <ConfirmDialog open={Boolean(confirm)} title={confirm?.title || ''} message={confirm?.message || ''} confirmLabel={confirm?.confirmLabel} onCancel={() => setConfirm(null)} onConfirm={() => { confirm?.action(); setConfirm(null); }} />
  </div>;
}
