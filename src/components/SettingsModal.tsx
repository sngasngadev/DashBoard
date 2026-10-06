import { Download, LayoutGrid, Upload, X } from 'lucide-react';

interface Props {
  open: boolean;
  autoCompact: boolean;
  onClose: () => void;
  onToggleAuto: (value: boolean) => void;
  onCompact: () => void;
  onExport: () => void;
  onImport: () => void;
}

export function SettingsModal(props: Props) {
  if (!props.open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={props.onClose}>
      <div className="modal settings-modal" onMouseDown={e => e.stopPropagation()}>
        <div className="modal-heading">
          <div><h2>설정</h2><p>배치와 백업 방식을 관리합니다.</p></div>
          <button className="icon-button" onClick={props.onClose} aria-label="닫기"><X size={19}/></button>
        </div>
        <section className="settings-section">
          <h3>카드 배치</h3>
          <div className="setting-row">
            <div><strong>빈 공간 자동 채우기</strong><span>카드를 이동·추가·삭제한 뒤 위쪽과 왼쪽부터 자동 정리합니다.</span></div>
            <label className="switch" title="빈 공간 자동 채우기"><input aria-label="빈 공간 자동 채우기" type="checkbox" checked={props.autoCompact} onChange={e => props.onToggleAuto(e.target.checked)} /><span aria-hidden="true" /></label>
          </div>
          <button className="button secondary wide" onClick={props.onCompact}><LayoutGrid size={17}/> 빈 공간 채우기</button>
        </section>
        <section className="settings-section">
          <h3>데이터와 다른 PC로 이동</h3>
          <p className="setting-help">이 PC에서는 브라우저 저장공간에 자동 저장됩니다. 다른 컴퓨터에서 이어서 쓰려면 백업 파일을 내보낸 뒤 새 컴퓨터에서 불러오세요.</p>
          <div className="button-row">
            <button className="button secondary" onClick={props.onExport}><Download size={17}/> 백업 내보내기</button>
            <button className="button secondary" onClick={props.onImport}><Upload size={17}/> 백업 불러오기</button>
          </div>
        </section>
      </div>
    </div>
  );
}
