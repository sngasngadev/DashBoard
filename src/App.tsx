import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import GridLayout, { type Layout } from 'react-grid-layout';
import { GripVertical, Plus, Settings } from 'lucide-react';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import './styles.css';
import type { BoardNote, CardRecord, CardType, DashboardState, MemoBoardData, MemoData, ScheduleData, ScheduleItem, TodoData, TodoItem } from './types/dashboard';
import { loadState, saveState, saveEmergencySnapshot, exportBackup, importBackup } from './lib/storage';
import { ADD_TILE_HEIGHT, ADD_TILE_WIDTH, GRID_COLS, repairOverlaps, resolveAddTileDrop, resolveCardDrop, resolveCardResize, resolveCompact, safeAddTilePosition } from './lib/layout';
import { createCard, createInitialState } from './lib/state';
import { AddCardModal } from './components/AddCardModal';
import { SettingsModal } from './components/SettingsModal';
import { ConfirmDialog } from './components/ConfirmDialog';
import { CardShell } from './components/CardShell';
import { TodoCard } from './cards/TodoCard';
import { ScheduleCard } from './cards/ScheduleCard';
import { MemoCard } from './cards/MemoCard';
import { MemoBoardCard } from './cards/MemoBoardCard';
import { TabOrderModal } from './components/TabOrderModal';
import { MemoBundleCard } from './cards/MemoBundleCard';
import { mainCards, mergeMainCards, repairMainCards, setCardMainVisibility } from './lib/visibility';
import { TrashModal } from './components/TrashModal';

const ADD_ID = '__add_card__';

type ConfirmState = null | { title: string; message: string; action: () => void; confirmLabel?: string; notice?: boolean };

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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string>('main');
  const [selectedMemoId, setSelectedMemoId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [tabOrderOpen, setTabOrderOpen] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [layoutRevision, setLayoutRevision] = useState(0);
  const gridRef = useRef<HTMLDivElement>(null);
  const latestState = useRef(state);
  const width = useContainerWidth(gridRef, loaded);
  const mobile = width !== null && width < 760;

  useEffect(() => {
    loadState()
      .then(value => { setState(value); setLoaded(true); })
      .catch(error => setLoadError(error instanceof Error ? error.message : '저장 데이터를 읽을 수 없습니다.'));
  }, []);

  // Commit a synchronous crash/close-safe snapshot before the browser paints.
  useLayoutEffect(() => {
    if (!loaded) return;
    latestState.current = state;
    try {
      saveEmergencySnapshot(state);
      setSaveStatus('saving');
    } catch {
      setSaveStatus('error');
    }
  }, [state, loaded]);

  useEffect(() => {
    if (!loaded) return;
    if(window.dashboardDesktop){
      let active=true;
      void saveState(state)
        .then(()=>{if(active)setSaveStatus('saved');})
        .catch(()=>{if(active)setSaveStatus('error');});
      return ()=>{active=false;};
    }
    const id = window.setTimeout(() => {
      saveState(state)
        .then(() => setSaveStatus('saved'))
        .catch(() => setSaveStatus('error'));
    }, 350);
    return () => window.clearTimeout(id);
  }, [state, loaded]);

  useEffect(() => {
    if (!loaded) return;
    const flush = () => { void saveState(latestState.current).catch(() => setSaveStatus('error')); };
    const onVisibility = () => { if (document.visibilityState === 'hidden') flush(); };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [loaded]);

  useEffect(() => {
    if (selected !== 'main' && !state.cards.some(card => card.id === selected)) setSelected('main');
  }, [selected, state.cards]);

  const updateCard = useCallback((id: string, patch: Partial<CardRecord>) => {
    setState(prev => {
      const cards=prev.cards.map(card=>card.id===id?{...card,...patch,updatedAt:new Date().toISOString()}:card);
      if(patch.showOnMain===undefined)return {...prev,cards};
      const arranged=setCardMainVisibility(cards,id,patch.showOnMain);
      return {
        ...prev,cards:arranged,
        settings:{...prev.settings,addTileLayout:safeAddTilePosition(mainCards(arranged),prev.settings.addTileLayout)}
      };
    });
  }, []);

  const updateData = useCallback((id: string, data: CardRecord['data']) => updateCard(id, { data }), [updateCard]);

  const askCardDelete = (card: CardRecord) => {
    if (card.favorite) return;
    setConfirm({ title: '카드를 삭제할까요?', message: `“${card.title || '제목 없음'}” 카드와 카드 안의 내용이 함께 삭제됩니다.`, action: () => { void (async () => { if (card.type === 'memoBundle' && window.dashboardDesktop) { try { await window.dashboardDesktop.trashCardNotes(card.id, card.title); } catch (error) { window.alert('삭제 실패: '+String(error)); return; } } setState(prev => {
      const remaining = prev.cards.filter(item => item.id !== card.id);
      if (prev.settings.autoCompact) {
        const result = resolveCompact(mainCards(remaining));
        return {
          ...prev,
          cards: mergeMainCards(remaining,result.cards),
          settings: { ...prev.settings, addTileLayout: result.addTileLayout }
        };
      }

      const visible = repairOverlaps(mainCards(remaining));
      const cards=mergeMainCards(remaining,visible);
      return {
        ...prev,
        cards,
        settings: {
          ...prev.settings,
          addTileLayout: safeAddTilePosition(mainCards(cards), prev.settings.addTileLayout)
        }
      };
    }); })(); } });
  };

  const addCard = (type: CardType,showOnMain=true) => {
    setState(prev => {
      const shown=mainCards(prev.cards);
      const created=createCard(type, shown);
      created.showOnMain=showOnMain;
      const appended = [...prev.cards,created];
      if (prev.settings.autoCompact) {
        const result = resolveCompact(mainCards(appended));
        return {
          ...prev,
          cards: mergeMainCards(appended,result.cards),
          settings: { ...prev.settings, addTileLayout: result.addTileLayout }
        };
      }

      const visible = repairOverlaps(mainCards(appended));
      const cards=mergeMainCards(appended,visible);
      return {
        ...prev,
        cards,
        settings: {
          ...prev.settings,
          addTileLayout: safeAddTilePosition(cards, prev.settings.addTileLayout)
        }
      };
    });
    setAddOpen(false);
  };

  const visibleCards = useMemo(() => state.cards.filter(card => card.showOnMain !== false), [state.cards]);
  const orderedTabs = useMemo(() => {
    const order = state.tabOrder || [];
    return [...state.cards].sort((a,b) => {
      const ia=order.indexOf(a.id), ib=order.indexOf(b.id);
      return (ia<0?Number.MAX_SAFE_INTEGER:ia)-(ib<0?Number.MAX_SAFE_INTEGER:ib);
    });
  }, [state.cards,state.tabOrder]);
  const layouts: Layout[] = useMemo(() => {
    const base = visibleCards.map(card => ({ i: card.id, ...card.layout, minW: 3, minH: 4 }));
    return [...base, {
      i: ADD_ID,
      ...state.settings.addTileLayout,
      minW: ADD_TILE_WIDTH,
      minH: ADD_TILE_HEIGHT,
      maxW: ADD_TILE_WIDTH,
      maxH: ADD_TILE_HEIGHT
    }];
  }, [visibleCards, state.settings.addTileLayout]);

  const applyDragStop = (layout: Layout[], movedId: string, target: Layout) => {
    setState(prev => {
      const addLayout = layout.find(item => item.i === ADD_ID);
      const droppedAdd = addLayout
        ? { x: addLayout.x, y: addLayout.y, w: ADD_TILE_WIDTH, h: ADD_TILE_HEIGHT }
        : prev.settings.addTileLayout;

      const shown=mainCards(prev.cards);
      const result = movedId === ADD_ID
        ? resolveAddTileDrop(shown, droppedAdd)
        : resolveCardDrop(
            shown,
            droppedAdd,
            movedId,
            { x: target.x, y: target.y, w: target.w, h: target.h },
            prev.settings.autoCompact
          );

      return {
        ...prev,
        cards: mergeMainCards(prev.cards,result.cards),
        settings: { ...prev.settings, addTileLayout: result.addTileLayout }
      };
    });

    // react-grid-layout keeps transient drag coordinates internally.
    // Remount after drop so the visual layout always matches persisted state.
    setLayoutRevision(value => value + 1);
  };

  const applyResizeStop = (layout: Layout[]) => {
    setState(prev => {
      const updatedLayouts = new Map(layout
        .filter(item => item.i !== ADD_ID)
        .map(item => [item.i, { x: item.x, y: item.y, w: item.w, h: item.h }]));

      const result = resolveCardResize(
        mainCards(prev.cards),
        prev.settings.addTileLayout,
        updatedLayouts,
        prev.settings.autoCompact
      );

      return {
        ...prev,
        cards: mergeMainCards(prev.cards,result.cards),
        settings: { ...prev.settings, addTileLayout: result.addTileLayout }
      };
    });

    setLayoutRevision(value => value + 1);
  };

  const askTodoDelete = (card: CardRecord, item: TodoItem) => setConfirm({ title: '할 일을 삭제할까요?', message: item.text.split('\n')[0] || '이 항목을 삭제합니다.', action: () => {
    const data = card.data as TodoData;
    updateData(card.id, { ...data, items: data.items.filter(i => i.id !== item.id) });
  } });

  const askNoteDelete = (card: CardRecord, note: BoardNote) => setConfirm({ title: '포스트잇을 삭제할까요?', message: note.text.split('\n')[0] || '빈 포스트잇을 삭제합니다.', action: () => {
    const data = card.data as MemoBoardData;
    updateData(card.id, { ...data, notes: data.notes.filter(i => i.id !== note.id) });
  } });

  const askScheduleDelete = (card: CardRecord, item: ScheduleItem) => setConfirm({ title: '일정을 삭제할까요?', message: item.text || item.date, action: () => {
    const data = card.data as ScheduleData;
    updateData(card.id, { ...data, items: data.items.filter(i => i.id !== item.id) });
  } });

  const renderContent = (card: CardRecord, detail = false) => {
    if (card.type === 'memoBundle') return <MemoBundleCard cardId={card.id} cardTitle={card.title} detail={detail} onOpen={id => {setSelectedMemoId(id);setSelected(card.id);}} />;
    if (card.type === 'todo') return <TodoCard data={card.data as TodoData} detail={detail} onChange={data => updateData(card.id, data)} onAskDelete={item => askTodoDelete(card, item)} />;
    if (card.type === 'schedule') return <ScheduleCard data={card.data as ScheduleData} detail={detail} onChange={data => updateData(card.id, data)} onAskDelete={item => askScheduleDelete(card, item)} />;
    if (card.type === 'memo') return <MemoCard data={card.data as MemoData} detail={detail} onChange={data => updateData(card.id, data)} />;
    if (card.type === 'memoBoard') return <MemoBoardCard data={card.data as MemoBoardData} detail={detail} onChange={data => updateData(card.id, data)} onAskDelete={note => askNoteDelete(card, note)} />;
    return <div className="unsupported">지원되지 않는 카드 형식입니다.</div>;
  };

  const shell = (card: CardRecord, detail = false) => <CardShell key={card.id} card={card} detail={detail}
    onTitle={title => updateCard(card.id, { title })}
    onFavorite={() => updateCard(card.id, { favorite: !card.favorite })}
    onDelete={() => askCardDelete(card)}
    onOpenDetail={() => setSelected(card.id)}>
      {detail && <label className="main-visibility"><input type="checkbox" checked={card.showOnMain !== false} onChange={e => updateCard(card.id,{showOnMain:e.target.checked})}/> 메인에 표시</label>}
      {renderContent(card, detail)}
    </CardShell>;

  const doImport = async () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json,application/json';
    input.onchange = async () => {
      if (!input.files?.[0]) return;
      try {
        const imported = await importBackup(input.files[0]);
        setConfirm({
          title: '백업을 불러올까요?',
          message: '현재 대시보드 내용과 배치가 백업 파일의 내용으로 바뀝니다.',
          confirmLabel: '불러오기',
          action: () => setState(imported)
        });
      } catch (error) {
        setConfirm({
          title: '백업을 불러올 수 없습니다',
          message: error instanceof Error ? error.message : '백업 파일을 확인하세요.',
          confirmLabel: '확인',
          notice: true,
          action: () => undefined
        });
      }
    };
    input.click();
  };

  const selectedCard = state.cards.find(card => card.id === selected);
  useEffect(() => {if(selectedMemoId && selectedCard?.type === 'memoBundle'){window.dispatchEvent(new CustomEvent('dashboard:open-note',{detail:selectedMemoId}));setSelectedMemoId(null);}},[selectedMemoId,selectedCard]);

  if (loadError) return <main className="app-shell" role="alert" style={{ padding: 32 }}>
    <h1>대시보드 데이터를 불러올 수 없습니다</h1>
    <p>{loadError}</p>
    <p>기존 데이터를 덮어쓰지 않았습니다. 브라우저 저장소를 삭제하지 말고 저장소 접근 문제를 확인하세요.</p>
  </main>;
  if (!loaded) return <div className="app-shell loading-shell" aria-label="대시보드 불러오는 중" />;

  return <div className="app-shell">
    <header className="top-header">
      <div className="title-block">
        <input className="dashboard-title" value={state.meta.title} onChange={e => setState(prev => ({ ...prev, meta: { ...prev.meta, title: e.target.value } }))} aria-label="대시보드 제목" />
        <textarea className="dashboard-description" rows={1} value={state.meta.description} onChange={e => setState(prev => ({ ...prev, meta: { ...prev.meta, description: e.target.value } }))} aria-label="대시보드 설명" />
      </div>
      <div className="header-actions"><span className={`save-status ${saveStatus}`}>{saveStatus === 'saving' ? '저장 중…' : saveStatus === 'error' ? '저장 실패' : '저장됨'}</span><button className="settings-button" onClick={() => setSettingsOpen(true)}><Settings size={18}/><span>설정</span></button></div>
    </header>

    <nav className="tabs" aria-label="대시보드 탭">
      <button className={selected === 'main' ? 'active' : ''} onClick={() => setSelected('main')}>메인</button>
      {orderedTabs.map(card => <button key={card.id} className={selected === card.id ? 'active' : ''} onClick={() => setSelected(card.id)}>{card.favorite && '★ '}{card.title || '제목 없음'}</button>)}
    </nav>

    <main className="workspace" ref={gridRef}>
      {width === null ? null : selected === 'main' ? (
        mobile ? <div className="mobile-card-stack">{visibleCards.map(card => shell(card))}<button className="add-card-tile" onClick={() => setAddOpen(true)}><Plus size={24}/><strong>카드 추가</strong></button></div>
        : <GridLayout key={layoutRevision} className="layout" layout={layouts} cols={GRID_COLS} rowHeight={42} width={width} margin={[16, 16]} containerPadding={[0, 0]} draggableHandle=".drag-handle" draggableCancel="textarea, input, button:not(.drag-handle), select, [contenteditable='true']" preventCollision={false} allowOverlap compactType={null}
            onDragStop={(layout, _oldItem, newItem) => applyDragStop(layout, newItem.i, newItem)}
            onResizeStop={(layout) => applyResizeStop(layout)}>
            {visibleCards.map(card => <div key={card.id}>{shell(card)}</div>)}
            <div key={ADD_ID} className="add-card-tile">
              <button className="add-card-drag-handle drag-handle" type="button" aria-label="카드 추가 타일 이동" title="잡고 이동"><GripVertical size={17}/></button>
              <button className="add-card-action" type="button" onClick={() => setAddOpen(true)}><Plus size={24}/><strong>카드 추가</strong></button>
            </div>
          </GridLayout>
      ) : selectedCard ? <div className="detail-wrapper">{shell(selectedCard, true)}</div> : null}
    </main>

    <AddCardModal open={addOpen} onClose={() => setAddOpen(false)} onAdd={addCard} />
    <SettingsModal onTrash={() => {setSettingsOpen(false);setTrashOpen(true);}} onTabOrder={() => {setSettingsOpen(false);setTabOrderOpen(true);}} open={settingsOpen} autoCompact={state.settings.autoCompact} onClose={() => setSettingsOpen(false)}
      onToggleAuto={autoCompact => setState(prev => {
        if (autoCompact) {
          const result = resolveCompact(mainCards(prev.cards));
          return {
            ...prev,
            cards: mergeMainCards(prev.cards,result.cards),
            settings: { ...prev.settings, autoCompact, addTileLayout: result.addTileLayout }
          };
        }

        const cards=repairMainCards(prev.cards);
        return {
          ...prev,
          cards,
          settings: {
            ...prev.settings,
            autoCompact,
            addTileLayout: safeAddTilePosition(mainCards(cards), prev.settings.addTileLayout)
          }
        };
      })}
      onCompact={() => setState(prev => {
        const result = resolveCompact(mainCards(prev.cards));
        return { ...prev, cards: mergeMainCards(prev.cards,result.cards), settings: { ...prev.settings, addTileLayout: result.addTileLayout } };
      })}
      onExport={() => {void exportBackup(state).catch(error=>setConfirm({title:'백업 실패',message:String(error),notice:true,action:()=>undefined}));}}
      onImport={() => {
        if(window.dashboardDesktop){
          void window.dashboardDesktop.restoreBackup().catch(error=>setConfirm({title:'복원 실패',message:String(error),notice:true,action:()=>undefined}));
        }else{void doImport();}
      }} />
    <TrashModal open={trashOpen} groups={state.cards.filter(c=>c.type==='memoBundle').map(c=>({id:c.id,title:c.title}))} onClose={() => setTrashOpen(false)} />
    <TabOrderModal open={tabOrderOpen} cards={orderedTabs} onClose={() => setTabOrderOpen(false)} onSave={ids => {setState(prev=>({...prev,tabOrder:ids}));setTabOrderOpen(false);}} />
    <ConfirmDialog open={Boolean(confirm)} title={confirm?.title || ''} message={confirm?.message || ''} confirmLabel={confirm?.confirmLabel} notice={confirm?.notice} onCancel={() => setConfirm(null)} onConfirm={() => { confirm?.action(); setConfirm(null); }} />
  </div>;
}
