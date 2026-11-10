import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
import type { ScheduleData, ScheduleItem } from '../types/dashboard';
import { makeId } from '../lib/id';
import { scheduleUrgency, sortScheduleItems } from '../lib/schedule';

export function ScheduleCard({ data, onChange, onAskDelete, detail = false }: {
  data: ScheduleData;
  onChange: (data: ScheduleData) => void;
  onAskDelete: (item: ScheduleItem) => void;
  detail?: boolean;
}) {
  const localToday=()=>{const today=new Date();return `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;};
  const active = sortScheduleItems(data.items.filter(item => !item.done));
  const completed = sortScheduleItems(data.items.filter(item => item.done));

  const patch = (id: string, patchValue: Partial<ScheduleItem>) =>
    onChange({ ...data, items: data.items.map(item => item.id === id ? { ...item, ...patchValue } : item) });

  const add = () => {
    const chosenDate=data.draftDate || localToday();
    onChange({
      ...data,
      draftDate: localToday(),
      draftText: '',
      items: [...data.items, {
        id: makeId('schedule'),
        date: chosenDate,
        text: data.draftText.trimEnd(),
        done: false,
        createdAt: new Date().toISOString()
      }]
    });
  };

  const renderItem = (item: ScheduleItem) => {
    const urgency = scheduleUrgency(item.date, item.done);
    return <div className={`schedule-item ${item.done ? 'done' : ''} ${urgency}`} key={item.id}>
      <input
        className="schedule-check"
        type="checkbox"
        checked={item.done}
        aria-label="일정 완료"
        onChange={e => patch(item.id, { done: e.target.checked })}
      />
      <input
        className="schedule-date"
        type="date"
        value={item.date}
        aria-label="일정 날짜"
        onChange={e => patch(item.id, { date: e.target.value })}
      />
      <input
        className="schedule-text"
        value={item.text}
        aria-label="일정 내용"
        onChange={e => patch(item.id, { text: e.target.value })}
      />

    </div>;
  };

  return <div className={`schedule-card-content ${detail ? 'detail-mode' : ''}`}>
    <div className="schedule-list">
      {active.map(renderItem)}
      {active.length === 0 && <div className="empty-inline">등록된 일정이 없습니다.</div>}
    </div>

    {completed.length > 0 && <div className="completed-section schedule-completed">
      <button className="completed-toggle" onClick={() => onChange({ ...data, completedCollapsed: !data.completedCollapsed })}>
        {data.completedCollapsed ? <ChevronRight size={16}/> : <ChevronDown size={16}/>} 완료 {completed.length}
      </button>
      {!data.completedCollapsed && <div className="schedule-list completed-list">{completed.map(renderItem)}</div>}
    </div>}

    <div className="schedule-add">
      <input
        type="date"
        value={data.draftDate || localToday()}
        aria-label="새 일정 날짜"
        required
        onChange={e => onChange({ ...data, draftDate: e.target.value })}
      />
      <input
        value={data.draftText}
        aria-label="새 일정 내용"
        onChange={e => onChange({ ...data, draftText: e.target.value })}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault();
            add();
          }
        }}
      />
      <button className="button primary" onClick={add} ><Plus size={17}/> 추가</button>
    </div>
  </div>;
}
